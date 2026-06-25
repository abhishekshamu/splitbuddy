/**
 * SplitBuddy – Expense Routes + Smart Split Engine
 * GET    /api/expenses/group/:group_id
 * POST   /api/expenses
 * GET    /api/expenses/:id
 * PATCH  /api/expenses/:id
 * DELETE /api/expenses/:id
 */

const router = require('express').Router();
const Expense      = require('../models/Expense');
const Group        = require('../models/Group');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const logActivity = require('../config/activityLogger');
const { notifyUsers } = require('../utils/notificationHelper');

// ── Smart Split Engine ────────────────────────────────────────────
const calculateSplits = (amount, split_type, members, custom_splits = []) => {
  const total = parseFloat(amount);

  switch (split_type) {
    case 'equal': {
      if (!members || members.length === 0) return [];
      const each = parseFloat((total / members.length).toFixed(2));
      const remainder = parseFloat((total - each * members.length).toFixed(2));
      return members.map((m, i) => ({
        user: m.user,
        full_name: m.full_name,
        owed_amount: i === 0 ? each + remainder : each,
      }));
    }

    case 'custom': {
      return custom_splits.map(c => {
        const mem = members.find(m => (m.user?.toString() === c.user_id?.toString()) || (m.full_name === c.full_name));
        return {
          user: c.user_id,
          full_name: c.full_name || mem?.full_name || 'Member',
          owed_amount: parseFloat(c.amount || 0),
        };
      });
    }

    case 'percent': {
      return custom_splits.map(c => {
        const mem = members.find(m => (m.user?.toString() === c.user_id?.toString()) || (m.full_name === c.full_name));
        const p = parseFloat(c.percent || 0);
        return {
          user: c.user_id,
          full_name: c.full_name || mem?.full_name || 'Member',
          percent: p,
          owed_amount: parseFloat(((total * p) / 100).toFixed(2)),
        };
      });
    }

    default:
      if (!members || members.length === 0) return [];
      const each = parseFloat((total / members.length).toFixed(2));
      const remainder = parseFloat((total - each * members.length).toFixed(2));
      return members.map((m, i) => ({
        user: m.user,
        full_name: m.full_name,
        owed_amount: i === 0 ? each + remainder : each,
      }));
  }
};



// ── Get all user expenses (across all groups) ─────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, group_id, category, from_date, to_date } = req.query;

  // Find all groups the user belongs to
  const userGroups = await Group.find({ 
    'members.user': req.user.id, 
    'members.is_active': true 
  }, '_id');

  const groupIds = userGroups.map(g => g._id);

  const query = { 
    group: { $in: groupIds }, 
    is_deleted: false 
  };

  if (group_id && groupIds.some(id => id?.toString?.() === group_id?.toString?.())) {
    query.group = group_id;
  }

  if (category) query.category = category;

  if (from_date || to_date) {
    query.expense_date = {};
    if (from_date) query.expense_date.$gte = new Date(from_date);
    if (to_date)   query.expense_date.$lte = new Date(to_date);
  }

  const expenses = await Expense.find(query)
    .populate('group', 'name emoji color')
    .populate('paid_by', 'full_name avatar_url')
    .sort({ expense_date: -1, created_at: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(query);

  res.json({
    expenses: expenses.map(e => ({
      ...e.toObject(),
      paid_by_name: e.paid_by?.full_name || e.paid_by_name,
      paid_by_avatar: e.paid_by?.avatar_url
    })),
    total,
    page: parseInt(page),
    limit: parseInt(limit)
  });
}));

// ── Get group expenses (paginated + filtered) ─────────────────────
router.get('/group/:group_id', asyncHandler(async (req, res) => {
  const { group_id } = req.params;
  const { category, paid_by, from_date, to_date, page = 1, limit = 50 } = req.query;
  
  // Verify user is member of this group
  const group = await Group.findOne({ _id: group_id, 'members.user': req.user.id, 'members.is_active': true });
  if (!group) throw new AppError('Access denied: You are not a member of this group', 403);

  const query = { group: group_id, is_deleted: false };
  if (category) query.category = category;
  if (paid_by)  query.paid_by = paid_by;
  if (from_date || to_date) {
    query.expense_date = {};
    if (from_date) query.expense_date.$gte = new Date(from_date);
    if (to_date)   query.expense_date.$lte = new Date(to_date);
  }

  const expenses = await Expense.find(query)
    .populate('paid_by', 'full_name avatar_url')
    .populate('splits.user', 'full_name avatar_url')
    .sort({ expense_date: -1, created_at: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(query);

  res.json({ 
    expenses: expenses.map(e => ({
      ...e.toObject(),
      paid_by_name: e.paid_by?.full_name || e.paid_by_name,
      paid_by_avatar: e.paid_by?.avatar_url
    })), 
    total, 
    page: parseInt(page), 
    limit: parseInt(limit) 
  });
}));



// ── Add expense ───────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const {
    group_id, title, description, amount, category = 'other',
    split_type = 'equal', paid_by, member_ids = [], custom_splits = [],
    receipt_url, expense_date,
  } = req.body;

  if (!group_id || !title || !amount || !paid_by) {
    throw new AppError('group_id, title, amount and paid_by are required', 400);
  }

  const group = await Group.findById(group_id);
  if (!group) throw new AppError('Group not found', 404);

  const isMember = (group?.members || []).some(m => m?.user?.toString?.() === req?.user?.id?.toString?.() && m?.is_active);
  if (!isMember) throw new AppError('You are not a member of this group', 403);

  const splitMembers = member_ids.length 
    ? member_ids.map(m => typeof m === 'string' ? { full_name: m } : m)
    : group.members.filter(m => m.is_active).map(m => ({ 
        user: m.user || m._id, 
        full_name: m.full_name 
      }));
  
  const splits = calculateSplits(amount, split_type, splitMembers, custom_splits);

  const payer = group.members.find(m => 
    (m?.user && m?.user?.toString?.() === paid_by?.toString?.()) || 
    (m?.full_name === paid_by) ||
    (m?._id?.toString?.() === paid_by?.toString?.())
  );
  
  console.log("Incoming Expense Payload:", req.body);
  try {
    const expense = await Expense.create({
      group: group_id,
      title,
      description,
      amount,
      category,
      split_type,
      paid_by: payer?.user || payer?._id || (mongoose.Types.ObjectId.isValid(paid_by) ? paid_by : null),
      paid_by_name: payer?.full_name || payer?._id || 'Member',
      receipt_url,
      expense_date: expense_date || new Date(),
      created_by: req.user.id,
      splits
    });

    console.log("Expense Saved Successfully:", expense._id);

    const otherMembers = group.members
      .filter(m => m?.user && m?.user?.toString?.() !== payer?.user?.toString?.() && m?.is_active)
      .map(m => m.user);

    await notifyUsers(otherMembers, 'expense', 'New Expense Added', `${payer?.full_name || 'Someone'} added "${title}" in ${group.name}`, { expense_id: expense._id, group_id });

    await logActivity(group_id, req.user.id, 'expense', 'added', title);

    // ── Budget Warning Logic ─────────────────────────────────────────
    if (group.monthly_budget > 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthlySpend = await Expense.aggregate([
        { $match: { group: group._id, is_deleted: false, expense_date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const totalSpent = monthlySpend[0]?.total || 0;
      if (totalSpent >= group.monthly_budget) {
        const allMembers = group.members.filter(m => m.is_active).map(m => m.user);
        await notifyUsers(allMembers, 'budget', 'Budget Alert! 🚨', `Group "${group.name}" has reached its monthly budget of ₹${group.monthly_budget}. (Spent: ₹${totalSpent})`, { group_id });
      } else if (totalSpent >= group.monthly_budget * 0.8) {
        const allMembers = group.members.filter(m => m.is_active).map(m => m.user);
        await notifyUsers(allMembers, 'budget', 'Budget Warning 📈', `Group "${group.name}" has used 80% of its monthly budget. (Spent: ₹${totalSpent})`, { group_id });
      }
    }

    res.status(201).json({ expense });
  } catch (dbErr) {
    console.error("Database Save Error:", dbErr);
    throw dbErr;
  }
}));

// ── Get expense detail ────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('paid_by', 'full_name avatar_url')
    .populate('splits.user', 'full_name avatar_url');

  if (!expense || expense.is_deleted) throw new AppError('Expense not found', 404);

  res.json({ 
    expense: {
      ...expense.toObject(),
      paid_by_name: expense.paid_by.full_name,
      paid_by_avatar: expense.paid_by.avatar_url
    }
  });
}));

// ── Update expense ────────────────────────────────────────────────
router.patch('/:id', asyncHandler(async (req, res) => {
  const { title, description, amount, category, split_type, paid_by, member_ids, custom_splits, receipt_url, expense_date } = req.body;

  const expense = await Expense.findById(req.params.id);
  if (!expense || expense.is_deleted) throw new AppError('Expense not found', 404);
  
  // Authorization check (allow creator or group admin - for simplicity here creator)
  if (expense.created_by?.toString() !== req.user.id.toString()) {
    throw new AppError('Not authorized to edit this expense', 403);
  }

  const group = await Group.findById(expense.group);
  if (!group) throw new AppError('Group not found', 404);

  const update = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (amount !== undefined) update.amount = amount;
  if (category !== undefined) update.category = category;
  if (split_type !== undefined) update.split_type = split_type;
  if (receipt_url !== undefined) update.receipt_url = receipt_url;
  if (expense_date !== undefined) update.expense_date = expense_date;

  // Handle Payer Update
  if (paid_by !== undefined) {
    const payer = group.members.find(m => 
      (m?.user && m?.user?.toString() === paid_by?.toString()) || 
      (m?._id?.toString() === paid_by?.toString()) ||
      (m?.full_name === paid_by)
    );
    
    update.paid_by = payer?.user || payer?._id || (mongoose.Types.ObjectId.isValid(paid_by) ? paid_by : null);
    update.paid_by_name = payer?.full_name || 'Member';
  }

  // Re-calculate splits if amount, split_type, or members changed
  if (amount !== undefined || split_type !== undefined || member_ids !== undefined || custom_splits !== undefined) {
    const finalAmount = amount !== undefined ? amount : expense.amount;
    const finalType = split_type !== undefined ? split_type : expense.split_type;
    const finalCustom = custom_splits !== undefined ? custom_splits : expense.splits;
    
    // Ensure we pass proper member objects (with user and full_name) to calculateSplits
    let finalMembers = [];
    if (member_ids !== undefined) {
      finalMembers = member_ids.map(mId => {
        const m = group.members.find(gm => 
          (gm.user?.toString() === mId?.toString()) || 
          (gm._id?.toString() === mId?.toString()) ||
          (gm.full_name === mId)
        );
        return { 
          user: m?.user || (mongoose.Types.ObjectId.isValid(mId) ? mId : null), 
          full_name: m?.full_name || 'Member' 
        };
      });
    } else {
      finalMembers = expense.splits.map(s => ({ user: s.user, full_name: s.full_name }));
    }

    update.splits = calculateSplits(finalAmount, finalType, finalMembers, finalCustom);
  }

  const updated = await Expense.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true }
  ).populate('paid_by', 'full_name avatar_url').populate('splits.user', 'full_name avatar_url');

  await logActivity(updated.group, req.user.id, 'expense', 'updated', updated.title);
  
  res.json({ expense: updated });
}));

// ── Delete expense (hard) ─────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  
  if (!expense) {
    return res.status(404).json({
      error: "Expense not found"
    });
  }

  await logActivity(expense.group, req.user.id, 'expense', 'deleted', expense.title);
  
  return res.json({
    success: true
  });
}));

module.exports = router;
