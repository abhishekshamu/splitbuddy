const router = require('express').Router();
const Settlement = require('../models/Settlement');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const logActivity = require('../config/activityLogger');
const { createNotification } = require('../utils/notificationHelper');

// ── Debt Minimization Algorithm ───────────────────────────────────
const minimizeTransactions = (balances) => {
  const creditors = balances.filter(b => b.net_balance > 0.001).map(b => ({ ...b }));
  const debtors   = balances.filter(b => b.net_balance < -0.001).map(b => ({ ...b }));
  const txns = [];

  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt   = debtors[di];
    const amount = Math.min(credit.net_balance, Math.abs(debt.net_balance));

    if (amount > 0.001) {
      txns.push({
        from_id:   debt.id,
        from_name: debt.full_name,
        from_avatar: debt.avatar_url,
        to_id:     credit.id,
        to_name:   credit.full_name,
        to_avatar: credit.avatar_url,
        to_upi:    credit.upi_id,
        amount:    parseFloat(amount.toFixed(2)),
        status:    'pending'
      });
    }

    credit.net_balance -= amount;
    debt.net_balance   += amount;

    if (credit.net_balance < 0.001) ci++;
    if (Math.abs(debt.net_balance) < 0.001) di++;
  }

  return txns;
};

// Helper to get consistent member key
const getMemberKey = (m) => {
  // Priority: 1. User ID (if registered) 2. Member ID (subdocument _id)
  const id = m?.user?._id || m?.user || m?._id || m?.id;
  return id ? id?.toString?.() : (m?.full_name || "Unknown");
};

// ── Get Settlement Plan ───────────────────────────────────────────
router.get('/plan', authenticate, asyncHandler(async (req, res) => {
  const { group_id } = req.query;
  const currentUserId = req.user._id;
  
  let targetGroups = [];
  if (!group_id || group_id === 'all') {
    targetGroups = (await Group.find({ 
      'members.user': currentUserId, 
      'members.is_active': true 
    }).populate('members.user', 'full_name avatar_url upi_id')) || [];
  } else {
    const group = await Group.findById(group_id).populate('members.user', 'full_name avatar_url upi_id');
    if (!group) throw new AppError('Group not found', 404);
    targetGroups = [group];
  }

  if (!targetGroups || targetGroups.length === 0) {
    console.log("No groups found for user:", currentUserId);
    return res.json({ transactions: [], balances: [] });
  }

  const globalBalancesMap = {}; // Key: UserID or Name -> Value: { balance, user_data }

  for (const group of targetGroups) {
    if (!group) continue;
    const gid = group?._id;
    if (!gid) continue;

    const expenses = (await Expense.find({ group: gid, is_deleted: false })) || [];
    const totalExpense = expenses.reduce((sum, e) => sum + (e?.amount || 0), 0);
    const activeMembers = (group?.members || []).filter(m => m?.is_active);

    console.log(`Processing Group: ${group?.name || 'Unknown'}, Expenses: ${expenses.length}, Members: ${activeMembers.length}`);

    if (activeMembers.length === 0) continue;

    const equalShare = totalExpense / activeMembers.length;
    const paidMap = {};
    expenses.forEach(e => {
      const key = (e?.paid_by || e?.paid_by_name || 'unknown')?.toString?.() || 'unknown';
      paidMap[key] = (paidMap[key] || 0) + (e?.amount || 0);
    });

    // Subtract/Add settlements from paidMap to reflect money already paid back
    const settlements = await Settlement.find({ 
      group: gid, 
      status: { $in: ['completed', 'confirmed'] } 
    });
    
    settlements.forEach(s => {
      const fromKey = s.from_user?.toString?.() || s.from_name;
      const toKey = s.to_user?.toString?.() || s.to_name;
      
      if (fromKey) paidMap[fromKey] = (paidMap[fromKey] || 0) + (s.amount || 0);
      if (toKey) paidMap[toKey] = (paidMap[toKey] || 0) - (s.amount || 0);
    });

    activeMembers.forEach(m => {
      const uKey = m?.user?._id?.toString?.() || "";
      const mKey = m?._id?.toString?.() || "";
      const nameKey = m?.full_name || m?.user?.full_name || "Unknown";
      
      const paid = (uKey && paidMap[uKey]) || (mKey && paidMap[mKey]) || (nameKey && paidMap[nameKey]) || 0;
      const groupBalance = paid - equalShare;

      // Use User ID as primary key for merging, fallback to name
      const primaryKey = uKey || nameKey;
      if (primaryKey) {
        if (!globalBalancesMap[primaryKey]) {
          globalBalancesMap[primaryKey] = {
            id: uKey || mKey || "",
            full_name: nameKey,
            avatar_url: m?.user?.avatar_url || "",
            upi_id: m?.user?.upi_id || "",
            user_id: m?.user?._id || null,
            net_balance: 0
          };
        }
        globalBalancesMap[primaryKey].net_balance += groupBalance;
      }
    });
  }

  const balances = Object.values(globalBalancesMap).map(b => ({
    ...b,
    net_balance: parseFloat(b.net_balance.toFixed(8))
  }));

  // 7. Run debt minimization on merged balances
  const transactions = minimizeTransactions(balances);

  // 8. Round final output
  const roundedBalances = balances.map(b => ({
    ...b,
    net_balance: parseFloat(b.net_balance.toFixed(2))
  }));

  const roundedTransactions = transactions.map(t => ({
    ...t,
    amount: parseFloat(t.amount.toFixed(2))
  }));

  res.json({ transactions: roundedTransactions, balances: roundedBalances });
}));


// ── Record Settlement ─────────────────────────────────────────────
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { group_id, from_id, to_id, from_name, to_name, amount, method = 'cash' } = req.body;

  if (!amount || !from_name || !to_name) {
    throw new AppError('amount, from_name and to_name are required', 400);
  }

  const settlement = await Settlement.create({
    group: group_id,
    from_user: from_id,
    from_name,
    to_user: to_id,
    to_name,
    amount,
    method,
    status: 'completed',
    settled_at: new Date()
  });

  await logActivity(group_id, req.user.id, 'settlement', 'paid', `₹${amount} to ${to_name}`);
  
  if (to_id) {
    await createNotification(to_id, 'settle', 'Settlement Received', `${from_name} paid you ₹${amount}`, { settlement_id: settlement._id, group_id });
  }
  res.status(201).json({ settlement });
}));

// ── Get Settlement History ────────────────────────────────────────
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { group_id } = req.query;
  
  let query = { status: 'completed' };
  if (group_id && group_id !== 'all') {
    query.group = group_id;
  } else {
    const userGroups = await Group.find({ 'members.user': req.user._id }, '_id');
    query.group = { $in: userGroups.map(g => g._id) };
  }

  const history = await Settlement.find(query)
    .sort({ settled_at: -1 })
    .populate('from_user', 'full_name avatar_url')
    .populate('to_user', 'full_name avatar_url');

  res.json({ history });
}));

// ── Delete Settlement ─────────────────────────────────────────────
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const settlement = await Settlement.findByIdAndDelete(req.params.id);
  if (!settlement) throw new AppError('Settlement not found', 404);
  
  await logActivity(settlement.group, req.user.id, 'settle', 'deleted', `₹${settlement.amount} paid by ${settlement.from_name}`);
  res.json({ success: true });
}));

module.exports = router;
