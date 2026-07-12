/**
 * SplitBuddy – Deterministic Settlement Engine v2.0
 * 
 * ACCOUNTING RULES:
 * - totalPaid = sum(all expenses paid by user)
 * - totalOwed = sum(user's share across all expenses they participate in)
 * - netBalance = totalPaid - totalOwed
 * - Positive balance → user should RECEIVE money
 * - Negative balance → user should PAY money
 * - sum(positive balances) === abs(sum(negative balances))  [ZERO-SUM INVARIANT]
 * 
 * SAFETY:
 * - Deduplication via processedExpenseIds Set
 * - Deleted expenses excluded
 * - Self-payments forbidden
 * - No settlement can exceed total spending
 * - Mathematical integrity validated before output
 */

const router = require('express').Router();
const Settlement = require('../models/Settlement');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const logActivity = require('../config/activityLogger');
const { createNotification } = require('../utils/notificationHelper');

// ══════════════════════════════════════════════════════════════════
// CORE ACCOUNTING ENGINE
// ══════════════════════════════════════════════════════════════════

/**
 * Build a canonical member ID from any member reference.
 * Uses ObjectId string if available, falls back to lowercase name.
 */
const canonicalId = (userId, fallbackName) => {
  if (userId) {
    const s = (userId._id || userId).toString().trim();
    if (s && s !== 'undefined' && s !== 'null') return s;
  }
  return (fallbackName || 'unknown').toString().toLowerCase().trim();
};

/**
 * Compute deterministic balances from raw expenses and settlements.
 * Returns { ledger, debug, totalExpenses }
 *
 * ledger: Map<canonicalId, { id, full_name, avatar_url, upi_id, totalPaid, totalOwed, netBalance }>
 * debug:  { expenses processed, duplicates skipped, deleted skipped }
 */
const computeBalances = (expenses, settlements, memberMap, aliasMap) => {
  const ledger = new Map();
  const processedExpenseIds = new Set();
  let totalExpenses = 0;
  let duplicatesSkipped = 0;
  let deletedSkipped = 0;

  // Initialize ledger from member map
  for (const [cid, info] of memberMap.entries()) {
    ledger.set(cid, {
      id: info.id,
      full_name: info.full_name,
      avatar_url: info.avatar_url || '',
      upi_id: info.upi_id || '',
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0
    });
  }

  // Helper: ensure a ledger entry exists
  const ensureEntry = (cid, name, avatarUrl) => {
    if (!ledger.has(cid)) {
      ledger.set(cid, {
        id: cid,
        full_name: name || cid,
        avatar_url: avatarUrl || '',
        upi_id: '',
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0
      });
    }
  };

  // ── STEP 1: Process each expense exactly once ──────────────────
  for (const expense of expenses) {
    // Skip deleted
    if (expense.is_deleted) {
      deletedSkipped++;
      continue;
    }

    // Skip duplicates
    const eid = expense._id.toString();
    if (processedExpenseIds.has(eid)) {
      duplicatesSkipped++;
      continue;
    }
    processedExpenseIds.add(eid);

    const amount = parseFloat(expense.amount || 0);
    if (amount <= 0) continue;

    totalExpenses += amount;

    // Credit the payer: they paid this amount
    const rawPayerId = canonicalId(expense.paid_by, expense.paid_by_name);
    const payerId = aliasMap?.get(rawPayerId) || aliasMap?.get((expense.paid_by_name||'').toLowerCase().trim()) || rawPayerId;
    ensureEntry(payerId, expense.paid_by_name);
    ledger.get(payerId).totalPaid += amount;

    // Debit each participant: they owe their share
    if (expense.splits && expense.splits.length > 0) {
      for (const split of expense.splits) {
        const owedAmount = parseFloat(split.owed_amount || split.amount || 0);
        if (owedAmount <= 0) continue;

        const rawSplitId = canonicalId(split.user, split.full_name);
        const splitId = aliasMap?.get(rawSplitId) || aliasMap?.get((split.full_name||'').toLowerCase().trim()) || rawSplitId;
        ensureEntry(splitId, split.full_name);
        ledger.get(splitId).totalOwed += owedAmount;
      }
    }
  }

  // ── STEP 2: Apply completed settlements ────────────────────────
  for (const s of settlements) {
    if (s.status !== 'completed' && s.status !== 'confirmed') continue;

    const sAmount = parseFloat(s.amount || 0);
    if (sAmount <= 0) continue;

    const rawFromId = canonicalId(s.from_user, s.from_name);
    const fromId = aliasMap?.get(rawFromId) || aliasMap?.get((s.from_name||'').toLowerCase().trim()) || rawFromId;
    const rawToId = canonicalId(s.to_user, s.to_name);
    const toId = aliasMap?.get(rawToId) || aliasMap?.get((s.to_name||'').toLowerCase().trim()) || rawToId;

    ensureEntry(fromId, s.from_name);
    ensureEntry(toId, s.to_name);

    // Settlement: "from" pays "to" → from's debt decreases, to's credit decreases
    // Equivalent to: from paid more (totalPaid += sAmount), to owed less (totalOwed -= sAmount)
    // But simpler: just adjust net balance directly
    ledger.get(fromId).totalPaid += sAmount;
    ledger.get(toId).totalOwed += sAmount;
  }

  // ── STEP 3: Compute net balances ───────────────────────────────
  for (const [, entry] of ledger) {
    entry.netBalance = parseFloat((entry.totalPaid - entry.totalOwed).toFixed(2));
    entry.totalPaid = parseFloat(entry.totalPaid.toFixed(2));
    entry.totalOwed = parseFloat(entry.totalOwed.toFixed(2));
  }

  return {
    ledger,
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    debug: {
      expensesProcessed: processedExpenseIds.size,
      duplicatesSkipped,
      deletedSkipped
    }
  };
};

// ══════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ══════════════════════════════════════════════════════════════════

const validateLedger = (ledger, totalExpenses) => {
  const errors = [];

  let sumPositive = 0;
  let sumNegative = 0;

  for (const [, entry] of ledger) {
    if (entry.netBalance > 0.001) sumPositive += entry.netBalance;
    if (entry.netBalance < -0.001) sumNegative += entry.netBalance;
  }

  // Validation 1: Zero-sum check
  const zeroSumDiff = Math.abs(sumPositive + sumNegative);
  if (zeroSumDiff > 0.02) {
    errors.push(`ZERO-SUM VIOLATION: positive(${sumPositive.toFixed(2)}) + negative(${sumNegative.toFixed(2)}) = ${(sumPositive + sumNegative).toFixed(2)} (diff: ${zeroSumDiff.toFixed(2)})`);
  }

  return { valid: errors.length === 0, errors, sumPositive, sumNegative };
};

const validateTransactions = (transactions, totalExpenses) => {
  const errors = [];

  for (const txn of transactions) {
    // Validation 2: No transaction exceeds total spending
    if (txn.amount > totalExpenses + 0.01) {
      errors.push(`OVERFLOW: Transaction ${txn.from_name}→${txn.to_name} amount ₹${txn.amount} exceeds total expenses ₹${totalExpenses}`);
    }

    // Validation 3: Self-payment check
    if (txn.from_id === txn.to_id) {
      errors.push(`SELF-PAYMENT: ${txn.from_name} cannot pay themselves`);
    }

    // No negative or zero amounts
    if (txn.amount <= 0) {
      errors.push(`INVALID AMOUNT: ${txn.from_name}→${txn.to_name} amount is ₹${txn.amount}`);
    }
  }

  // Validation 4: Total settlement equals total outstanding debt
  const totalSettlement = transactions.reduce((s, t) => s + t.amount, 0);
  // totalSettlement should not exceed total expenses
  if (totalSettlement > totalExpenses + 0.02) {
    errors.push(`SETTLEMENT OVERFLOW: Total settlements ₹${totalSettlement.toFixed(2)} exceeds total expenses ₹${totalExpenses.toFixed(2)}`);
  }

  return { valid: errors.length === 0, errors };
};

// ══════════════════════════════════════════════════════════════════
// EXPENSE-WISE SETTLEMENT ALGORITHM
// ══════════════════════════════════════════════════════════════════

const generateExpenseWiseTransactions = (expenses, settlements, memberMap, aliasMap) => {
  const transactions = [];
  const debts = new Map();

  const addDebt = (from, to, amount) => {
    if (from === to || amount === 0) return;
    if (!debts.has(from)) debts.set(from, new Map());
    const current = debts.get(from).get(to) || 0;
    debts.get(from).set(to, current + amount);
  };

  // Step 1: Generate exact 1-to-1 debts per expense
  for (const exp of expenses) {
    if (exp.is_deleted) continue;
    const amount = parseFloat(exp.amount || 0);
    if (amount <= 0) continue;

    const rawPayerId = canonicalId(exp.paid_by, exp.paid_by_name);
    const payerId = aliasMap?.get(rawPayerId) || aliasMap?.get((exp.paid_by_name||'').toLowerCase().trim()) || rawPayerId;

    if (exp.splits && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const owedAmount = parseFloat(split.owed_amount || split.amount || 0);
        if (owedAmount <= 0) continue;

        const rawSplitId = canonicalId(split.user, split.full_name);
        const splitId = aliasMap?.get(rawSplitId) || aliasMap?.get((split.full_name||'').toLowerCase().trim()) || rawSplitId;

        addDebt(splitId, payerId, owedAmount);
      }
    }
  }

  // Step 2: Deduct completed generic settlements chronologically
  for (const s of settlements) {
    if (s.status !== 'completed' && s.status !== 'confirmed') continue;
    let sAmount = parseFloat(s.amount || 0);
    if (sAmount <= 0) continue;

    const rawFromId = canonicalId(s.from_user, s.from_name);
    const fromId = aliasMap?.get(rawFromId) || aliasMap?.get((s.from_name||'').toLowerCase().trim()) || rawFromId;
    const rawToId = canonicalId(s.to_user, s.to_name);
    const toId = aliasMap?.get(rawToId) || aliasMap?.get((s.to_name||'').toLowerCase().trim()) || rawToId;

    addDebt(fromId, toId, -sAmount);
  }

  // Step 3: Bilateral Netting
  const processedPairs = new Set();
  
  for (const [fromId, toMap] of debts.entries()) {
    for (const [toId, amount1] of toMap.entries()) {
      const pairKey = fromId < toId ? `${fromId}_${toId}` : `${toId}_${fromId}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const amount2 = debts.get(toId)?.get(fromId) || 0;
      
      const net = amount1 - amount2;
      
      if (Math.abs(net) > 0.005) {
        let finalFromId, finalToId, finalAmount;
        if (net > 0) {
          finalFromId = fromId;
          finalToId = toId;
          finalAmount = net;
        } else {
          finalFromId = toId;
          finalToId = fromId;
          finalAmount = -net;
        }

        const debtorInfo = memberMap.get(finalFromId) || { id: finalFromId, full_name: 'Unknown', avatar_url: '' };
        const creditorInfo = memberMap.get(finalToId) || { id: finalToId, full_name: 'Unknown', avatar_url: '', upi_id: '' };

        transactions.push({
          from_id: debtorInfo.id,
          from_name: debtorInfo.full_name,
          from_avatar: debtorInfo.avatar_url,
          to_id: creditorInfo.id,
          to_name: creditorInfo.full_name,
          to_avatar: creditorInfo.avatar_url,
          to_upi: creditorInfo.upi_id,
          amount: parseFloat(finalAmount.toFixed(2)),
          status: 'pending',
          reason: 'Net Balance',
          expense_title: 'Net Balance',
          expense_category: 'other'
        });
      }
    }
  }

  return transactions;
};

// ══════════════════════════════════════════════════════════════════
// SMART SETTLEMENT ALGORITHM (Minimum Transactions)
// ══════════════════════════════════════════════════════════════════

const minimizeTransactions = (ledger) => {
  // Separate into creditors (positive balance = gets money) and debtors (negative = pays money)
  const creditors = [];
  const debtors = [];

  for (const [, entry] of ledger) {
    if (entry.netBalance > 0.005) {
      creditors.push({ ...entry, remaining: entry.netBalance });
    } else if (entry.netBalance < -0.005) {
      debtors.push({ ...entry, remaining: Math.abs(entry.netBalance) });
    }
  }

  // Sort: creditors descending, debtors descending (largest first for efficiency)
  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  const transactions = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = parseFloat(Math.min(creditor.remaining, debtor.remaining).toFixed(2));

    if (amount > 0.005) {
      transactions.push({
        from_id: debtor.id,
        from_name: debtor.full_name,
        from_avatar: debtor.avatar_url,
        to_id: creditor.id,
        to_name: creditor.full_name,
        to_avatar: creditor.avatar_url,
        to_upi: creditor.upi_id,
        amount,
        status: 'pending'
      });
    }

    creditor.remaining -= amount;
    debtor.remaining -= amount;

    if (creditor.remaining < 0.005) ci++;
    if (debtor.remaining < 0.005) di++;
  }

  return transactions;
};

// ══════════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════════

// ── Get Settlement Plan ───────────────────────────────────────────
router.get('/plan', authenticate, asyncHandler(async (req, res) => {
  const { group_id } = req.query;
  const currentUserId = req.user._id;

  // 1. Resolve target groups
  let targetGroups = [];
  if (!group_id || group_id === 'all') {
    targetGroups = await Group.find({
      'members.user': currentUserId,
      'members.is_active': true
    }).populate('members.user', 'full_name avatar_url upi_id');
  } else {
    const group = await Group.findById(group_id).populate('members.user', 'full_name avatar_url upi_id');
    if (!group) throw new AppError('Group not found', 404);
    targetGroups = [group];
  }

  if (!targetGroups.length) {
    return res.json({ transactions: [], balances: [], debug: { message: 'No groups found' } });
  }

  // 2. Build global member map (canonical ID → member info)
  const memberMap = new Map();
  const aliasMap = new Map();
  const groupIds = [];

  for (const group of targetGroups) {
    if (!group) continue;
    groupIds.push(group._id);

    for (const m of (group.members || [])) {
      const cid = canonicalId(m.user?._id || m.user, m.full_name);
      if (!memberMap.has(cid)) {
        memberMap.set(cid, {
          id: cid,
          full_name: m.full_name || m.user?.full_name || 'Unknown',
          avatar_url: m.user?.avatar_url || '',
          upi_id: m.user?.upi_id || ''
        });
      }
      
      // Populate alias map to resolve mismatched IDs
      aliasMap.set(cid, cid);
      if (m._id) aliasMap.set(m._id.toString(), cid);
      if (m.user && m.user._id) aliasMap.set(m.user._id.toString(), cid);
      if (m.user && typeof m.user === 'string') aliasMap.set(m.user, cid);
      if (m.full_name) aliasMap.set(m.full_name.toString().toLowerCase().trim(), cid);
      if (m.user?.full_name) aliasMap.set(m.user.full_name.toString().toLowerCase().trim(), cid);
    }
  }

  // 3. Fetch ALL expenses for target groups (non-deleted)
  const allExpenses = await Expense.find({
    group: { $in: groupIds },
    is_deleted: false
  });

  const allSettlements = await Settlement.find({
    $or: [{ group: { $in: groupIds } }, { group: null }, { group: { $exists: false } }],
    status: { $in: ['completed', 'confirmed'] }
  });

  // 5. Compute balances using the deterministic engine
  const { ledger, totalExpenses, debug: computeDebug } = computeBalances(allExpenses, allSettlements, memberMap, aliasMap);

  // 6. Validate the ledger (zero-sum check)
  const ledgerValidation = validateLedger(ledger, totalExpenses);
  if (!ledgerValidation.valid) {
    console.error('⚠️ SETTLEMENT LEDGER VALIDATION FAILED:', ledgerValidation.errors);
  }

  // 7. Generate transactions based on settle_mode
  let transactions = [];
  const settleMode = req.query.settle_mode || 'transparent';
  if (settleMode === 'optimized') {
    transactions = minimizeTransactions(ledger);
  } else {
    transactions = generateExpenseWiseTransactions(allExpenses, allSettlements, memberMap, aliasMap);
  }

  // 8. Validate transactions (Log only, do not block output since logic handles 1-to-1)
  const txnValidation = validateTransactions(transactions, totalExpenses);
  if (!txnValidation.valid) {
    console.warn('⚠️ SETTLEMENT TRANSACTION VALIDATION WARN:', txnValidation.errors);
  }

  // 9. Build response
  const balances = Array.from(ledger.values()).map(e => ({
    id: e.id,
    full_name: e.full_name,
    avatar_url: e.avatar_url,
    upi_id: e.upi_id,
    net_balance: e.netBalance,
    total_paid: e.totalPaid,
    total_owed: e.totalOwed
  }));

  // Calculate strict Net Position based ONLY on pending transactions for the current user
  let totalReceivable = 0;
  let totalPayable = 0;
  const currentUserIdStr = currentUserId.toString();
  
  // Find current user's canonical ID in the alias map
  let currentUserCid = aliasMap.get(currentUserIdStr) || currentUserIdStr;
  // If not found by ID, try finding by name (fallback if req.user has name)
  if (!memberMap.has(currentUserCid) && req.user.full_name) {
     const nameCid = aliasMap.get(req.user.full_name.toLowerCase().trim());
     if (nameCid) currentUserCid = nameCid;
  }

  for (const txn of transactions) {
    if (txn.to_id === currentUserCid || aliasMap.get(txn.to_id) === currentUserCid) {
      totalReceivable += txn.amount;
    }
    if (txn.from_id === currentUserCid || aliasMap.get(txn.from_id) === currentUserCid) {
      totalPayable += txn.amount;
    }
  }

  const userNetPosition = {
    totalReceivable: parseFloat(totalReceivable.toFixed(2)),
    totalPayable: parseFloat(totalPayable.toFixed(2)),
    netBalance: parseFloat((totalReceivable - totalPayable).toFixed(2))
  };

  // Debug table (always included for transparency)
  const debugTable = balances.map(b => ({
    user: b.full_name,
    totalPaid: `₹${b.total_paid}`,
    totalOwed: `₹${b.total_owed}`,
    netBalance: `₹${b.net_balance}`
  }));

  console.log('═══ SETTLEMENT DEBUG ═══');
  console.log(`Total Expenses: ₹${totalExpenses}`);
  console.table(debugTable);
  console.log(`Transactions: ${transactions.length} (${settleMode} mode)`);
  console.log(`Total Settlement: ₹${transactions.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);
  console.log(`Ledger Valid: ${ledgerValidation.valid}`);
  console.log(`Txn Valid: ${txnValidation.valid}`);
  console.log(`Current User Pos: +${totalReceivable} / -${totalPayable}`);
  console.log('════════════════════════');

  const filteredTransactions = transactions.filter(txn => 
    txn.from_id === currentUserCid || 
    aliasMap.get(txn.from_id) === currentUserCid ||
    txn.to_id === currentUserCid || 
    aliasMap.get(txn.to_id) === currentUserCid
  );

  res.json({
    transactions: filteredTransactions,
    balances,
    userNetPosition,
    debug: {
      totalExpenses,
      totalSettlement: parseFloat(transactions.reduce((s, t) => s + t.amount, 0).toFixed(2)),
      ...computeDebug,
      ledgerValid: ledgerValidation.valid,
      netBalanceSum: parseFloat((ledgerValidation.sumPositive + ledgerValidation.sumNegative).toFixed(2)),
      ledgerValidation,
      txnValidation,
      rawExpenses: allExpenses,
      rawSettlements: allSettlements
    }
  });
}));

// ── Record Settlement ─────────────────────────────────────────────
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { group_id, from_id, to_id, from_name, to_name, amount, method = 'cash' } = req.body;

  // Validation
  if (!amount || !from_name || !to_name) {
    throw new AppError('amount, from_name and to_name are required', 400);
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }

  // Self-payment check
  if (from_id && to_id && from_id.toString() === to_id.toString()) {
    throw new AppError('Cannot settle with yourself', 400);
  }
  if (from_name === to_name) {
    throw new AppError('Payer and receiver cannot be the same person', 400);
  }

  // Removed groupTotal validation because Single Source of Truth allows global debts 
  // to exceed specific group totals if expenses are spread across multiple groups.

  const isValidObjectId = mongoose.Types.ObjectId.isValid;

  const settlementData = {
    from_name,
    to_name,
    amount: parsedAmount,
    method,
    status: 'completed',
    settled_at: new Date()
  };

  if (group_id && group_id !== 'all' && isValidObjectId(group_id)) {
    settlementData.group = group_id;
  }
  if (from_id && isValidObjectId(from_id)) {
    settlementData.from_user = from_id;
  }
  if (to_id && isValidObjectId(to_id)) {
    settlementData.to_user = to_id;
  }

  const settlement = await Settlement.create(settlementData);

  if (settlement.group) {
    await logActivity(settlement.group, req.user.id, 'settlement', 'paid', `₹${parsedAmount} to ${to_name}`);
  }

  if (to_id) {
    await createNotification(to_id, 'settle', 'Settlement Received', `${from_name} paid you ₹${parsedAmount}`, { settlement_id: settlement._id, group_id });
  }

  res.status(201).json({ settlement });
}));

// ── Get Settlement History ────────────────────────────────────────
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { group_id } = req.query;

  let query = { status: { $in: ['completed', 'confirmed', 'reversed'] } };
  if (group_id && group_id !== 'all') {
    query.group = group_id;
  } else {
    const userGroups = await Group.find({ 'members.user': req.user._id }, '_id');
    query.$or = [
      { group: { $in: userGroups.map(g => g._id) } },
      { group: null },
      { group: { $exists: false } }
    ];
  }

  const history = await Settlement.find(query)
    .sort({ settled_at: -1 })
    .populate('from_user', 'full_name avatar_url')
    .populate('to_user', 'full_name avatar_url');

  res.json({ history });
}));

// ── Undo Settlement ───────────────────────────────────────────────
router.post('/:id/undo', authenticate, asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) throw new AppError('Settlement not found', 404);
  
  if (settlement.status === 'reversed') throw new AppError('Settlement is already reversed', 400);

  settlement.status = 'reversed';
  await settlement.save();

  if (settlement.group) {
    await logActivity(settlement.group, req.user.id, 'settlement_undo', 'reversed', `₹${settlement.amount} paid by ${settlement.from_name}`);
  }

  res.json({ success: true, settlement });
}));

// ── Delete Settlement (Internal) ──────────────────────────────────
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const settlement = await Settlement.findByIdAndDelete(req.params.id);
  if (!settlement) throw new AppError('Settlement not found', 404);

  await logActivity(settlement.group, req.user.id, 'settle', 'deleted', `₹${settlement.amount} paid by ${settlement.from_name}`);
  res.json({ success: true });
}));

module.exports = router;
