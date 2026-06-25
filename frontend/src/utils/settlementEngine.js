/**
 * Client-Side Settlement Engine
 * 
 * Supports two modes:
 * 1. Transparent: 1-to-1 expense-wise settlements
 * 2. Optimized: Minimum cash flow aggregated settlements
 */

const canonicalId = (userId, fallbackName) => {
  if (userId) {
    const s = (userId._id || userId).toString().trim();
    if (s && s !== 'undefined' && s !== 'null') return s;
  }
  return (fallbackName || 'unknown').toString().toLowerCase().trim();
};

export const computeBalances = (expenses, settlements, groupMembers) => {
  const ledger = new Map();
  const aliasMap = new Map();

  // 1. Setup Member Map & Aliases
  for (const m of groupMembers || []) {
    const cid = canonicalId(m.user?._id || m.user, m.full_name);
    ledger.set(cid, {
      id: cid,
      full_name: m.full_name || m.user?.full_name || 'Unknown',
      avatar_url: m.user?.avatar_url || '',
      upi_id: m.user?.upi_id || '',
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0
    });

    aliasMap.set(cid, cid);
    if (m._id) aliasMap.set(m._id.toString(), cid);
    if (m.user && m.user._id) aliasMap.set(m.user._id.toString(), cid);
    if (m.user && typeof m.user === 'string') aliasMap.set(m.user, cid);
    if (m.full_name) aliasMap.set(m.full_name.toString().toLowerCase().trim(), cid);
    if (m.user?.full_name) aliasMap.set(m.user.full_name.toString().toLowerCase().trim(), cid);
  }

  const ensureEntry = (cid, name) => {
    if (!ledger.has(cid)) {
      ledger.set(cid, {
        id: cid,
        full_name: name || cid,
        avatar_url: '',
        upi_id: '',
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0
      });
    }
  };

  // 2. Process Expenses
  for (const exp of expenses) {
    if (exp.is_deleted) continue;
    const amount = parseFloat(exp.amount || 0);
    if (amount <= 0) continue;

    const rawPayerId = canonicalId(exp.paid_by, exp.paid_by_name);
    const payerId = aliasMap.get(rawPayerId) || aliasMap.get((exp.paid_by_name||'').toLowerCase().trim()) || rawPayerId;
    ensureEntry(payerId, exp.paid_by_name);
    ledger.get(payerId).totalPaid += amount;

    if (exp.splits && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const owedAmount = parseFloat(split.owed_amount || split.amount || 0);
        if (owedAmount <= 0) continue;

        const rawSplitId = canonicalId(split.user, split.full_name);
        const splitId = aliasMap.get(rawSplitId) || aliasMap.get((split.full_name||'').toLowerCase().trim()) || rawSplitId;
        ensureEntry(splitId, split.full_name);
        ledger.get(splitId).totalOwed += owedAmount;
      }
    }
  }

  // 3. Process Completed Settlements
  for (const s of settlements) {
    if (s.status !== 'completed' && s.status !== 'confirmed') continue;
    const sAmount = parseFloat(s.amount || 0);
    if (sAmount <= 0) continue;

    const rawFromId = canonicalId(s.from_user, s.from_name);
    const fromId = aliasMap.get(rawFromId) || aliasMap.get((s.from_name||'').toLowerCase().trim()) || rawFromId;
    const rawToId = canonicalId(s.to_user, s.to_name);
    const toId = aliasMap.get(rawToId) || aliasMap.get((s.to_name||'').toLowerCase().trim()) || rawToId;

    ensureEntry(fromId, s.from_name);
    ensureEntry(toId, s.to_name);

    ledger.get(fromId).totalPaid += sAmount;
    ledger.get(toId).totalOwed += sAmount;
  }

  // 4. Compute Net Balances
  for (const [, entry] of ledger) {
    entry.netBalance = parseFloat((entry.totalPaid - entry.totalOwed).toFixed(2));
    entry.totalPaid = parseFloat(entry.totalPaid.toFixed(2));
    entry.totalOwed = parseFloat(entry.totalOwed.toFixed(2));
  }

  return { ledger, aliasMap };
};

export const generateTransparentSettlements = (expenses, settlements, ledger, aliasMap) => {
  const transactions = [];
  const debts = new Map(); // nested map: from_id -> to_id -> amount

  const addDebt = (from, to, amount) => {
    if (from === to || amount === 0) return;
    if (!debts.has(from)) debts.set(from, new Map());
    const current = debts.get(from).get(to) || 0;
    debts.get(from).set(to, current + amount);
  };

  // Step 1: Accumulate raw 1-to-1 debts per expense
  for (const exp of expenses) {
    if (exp.is_deleted) continue;
    const amount = parseFloat(exp.amount || 0);
    if (amount <= 0) continue;

    const rawPayerId = canonicalId(exp.paid_by, exp.paid_by_name);
    const payerId = aliasMap.get(rawPayerId) || aliasMap.get((exp.paid_by_name||'').toLowerCase().trim()) || rawPayerId;

    if (exp.splits && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const owedAmount = parseFloat(split.owed_amount || split.amount || 0);
        if (owedAmount <= 0) continue;

        const rawSplitId = canonicalId(split.user, split.full_name);
        const splitId = aliasMap.get(rawSplitId) || aliasMap.get((split.full_name||'').toLowerCase().trim()) || rawSplitId;

        addDebt(splitId, payerId, owedAmount);
      }
    }
  }

  // Step 2: Deduct completed settlements
  for (const s of settlements) {
    if (s.status !== 'completed' && s.status !== 'confirmed') continue;
    const sAmount = parseFloat(s.amount || 0);
    if (sAmount <= 0) continue;

    const rawFromId = canonicalId(s.from_user, s.from_name);
    const fromId = aliasMap.get(rawFromId) || aliasMap.get((s.from_name||'').toLowerCase().trim()) || rawFromId;
    const rawToId = canonicalId(s.to_user, s.to_name);
    const toId = aliasMap.get(rawToId) || aliasMap.get((s.to_name||'').toLowerCase().trim()) || rawToId;

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

        const debtorInfo = ledger.get(finalFromId) || { id: finalFromId, full_name: 'Unknown', avatar_url: '' };
        const creditorInfo = ledger.get(finalToId) || { id: finalToId, full_name: 'Unknown', avatar_url: '', upi_id: '' };

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

export const generateOptimizedSettlements = (ledger) => {
  const creditors = [];
  const debtors = [];

  for (const [, entry] of ledger) {
    if (entry.netBalance > 0.005) {
      creditors.push({ ...entry, remaining: entry.netBalance });
    } else if (entry.netBalance < -0.005) {
      debtors.push({ ...entry, remaining: Math.abs(entry.netBalance) });
    }
  }

  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  const transactions = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = parseFloat(Math.min(creditor.remaining, debtor.remaining).toFixed(2));

    if (amount > 0) {
      transactions.push({
        from_id: debtor.id,
        from_name: debtor.full_name,
        from_avatar: debtor.avatar_url,
        to_id: creditor.id,
        to_name: creditor.full_name,
        to_avatar: creditor.avatar_url,
        to_upi: creditor.upi_id,
        amount,
        status: 'pending',
        reason: 'Optimized Settlement'
      });
    }

    creditor.remaining -= amount;
    debtor.remaining -= amount;

    if (creditor.remaining < 0.01) ci++;
    if (debtor.remaining < 0.01) di++;
  }

  return transactions;
};
