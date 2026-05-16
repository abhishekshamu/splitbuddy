/**
 * SplitBuddy – Group Routes
 * GET    /api/groups
 * POST   /api/groups
 * GET    /api/groups/:group_id
 * PATCH  /api/groups/:group_id
 * DELETE /api/groups/:group_id
 * POST   /api/groups/:group_id/invite
 * POST   /api/groups/join/:invite_code
 * DELETE /api/groups/:group_id/leave
 * GET    /api/groups/:group_id/members
 * PATCH  /api/groups/:group_id/members/:user_id
 */

const router = require('express').Router();
const Group        = require('../models/Group');
const User         = require('../models/User');
const Expense      = require('../models/Expense');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { requireGroupAdmin, requireGroupMember } = require('../middleware/auth');
const mongoose = require('mongoose');

// Helper to calculate balances for a group
const calculateBalances = async (groupId) => {
  const gId = new mongoose.Types.ObjectId(groupId);
  
  const paidResult = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false } },
    { $group: { _id: '$paid_by', total: { $sum: '$amount' } } }
  ]);

  const owedResult = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false } },
    { $unwind: '$splits' },
    { $group: { _id: '$splits.user', total: { $sum: '$splits.owed_amount' } } }
  ]);

  const balances = {};
  paidResult.forEach(r => { balances[r._id] = (balances[r._id] || 0) + r.total; });
  owedResult.forEach(r => { balances[r._id] = (balances[r._id] || 0) - r.total; });
  
  return {
    paid: Object.fromEntries(paidResult.map(r => [r._id, r.total])),
    owed: Object.fromEntries(owedResult.map(r => [r._id, r.total])),
    net: balances
  };
};

// ── List user's groups ────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const groups = await Group.find({
    'members.user': req.user.id,
    'members.is_active': true,
    is_archived: false
  })
  .populate('members.user', 'full_name avatar_url')
  .sort({ created_at: -1 });

  // Add expense counts and total spent (could be optimized with aggregation)
  const groupData = await Promise.all(groups.map(async (g) => {
    const expenseStats = await Expense.aggregate([
      { $match: { group: g._id, is_deleted: false } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    return {
      ...g.toObject(),
      expense_count: expenseStats[0]?.count || 0,
      total_spent: expenseStats[0]?.total || 0,
      members: g.members.filter(m => m.is_active).map(m => ({
        id: m.user?._id || m._id,
        full_name: m.full_name || m.user?.full_name || 'Member',
        avatar_url: m.user?.avatar_url,
        role: m.role
      }))
    };
  }));

  res.json({ groups: groupData });
}));

// ── Create group ──────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, emoji = '🏠', type = 'flatmates', color = '#9b6dff', members: memberNames = [] } = req.body;
  if (!name) throw new AppError('Group name is required', 400);

  const members = [{
    user: req.user._id,
    full_name: req.user.full_name,
    role: 'admin'
  }];

  for (const m of memberNames) {
    if (typeof m === 'string') {
      if (m === "You") continue;
      members.push({ full_name: m, role: 'member' });
    } else if (m && m.full_name) {
      if (m.user && m.user.toString() === req.user._id.toString()) continue;
      members.push({ 
        user: m.user, 
        full_name: m.full_name, 
        role: 'member' 
      });
    }
  }

  const group = await Group.create({
    name,
    description,
    emoji,
    type,
    color,
    created_by: req.user._id,
    members
  });

  res.status(201).json({ group });
}));

// ── Get group detail ──────────────────────────────────────────────
router.get('/:group_id', requireGroupMember, asyncHandler(async (req, res) => {
  const group = req.group.toObject(); // Set by middleware
  
  const expenseStats = await Expense.aggregate([
    { $match: { group: req.group._id, is_deleted: false } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
  ]);

  const balances = await calculateBalances(req.group._id);

  // Populate member details with balances
  const populatedMembers = req.group.members.filter(m => m.is_active).map(m => {
    return {
      id: m.user || m._id,
      full_name: m.full_name || m.user?.full_name || 'Member',
      avatar_url: m.user?.avatar_url,
      role: m.role,
      joined_at: m.joined_at,
      net_balance: balances.net[m.user || m._id] || 0
    };
  });

  res.json({
    group: {
      ...group,
      expense_count: expenseStats[0]?.count || 0,
      total_spent: expenseStats[0]?.total || 0,
      member_count: populatedMembers.length,
      members: populatedMembers
    }
  });
}));

// ── Update group ──────────────────────────────────────────────────
router.patch('/:group_id', requireGroupAdmin, asyncHandler(async (req, res) => {
  const { name, description, emoji, type, color, monthly_budget, is_archived, members: new_members } = req.body;
  
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (emoji !== undefined) update.emoji = emoji;
  if (type !== undefined) update.type = type;
  if (color !== undefined) update.color = color;
  if (monthly_budget !== undefined) update.monthly_budget = monthly_budget;
  if (is_archived !== undefined) update.is_archived = is_archived;

  // Handle members update if provided
  if (new_members !== undefined) {
    update.members = new_members.map(m => {
      // If it's a string, it's a new member name
      if (typeof m === 'string') {
        if (m === "You" || m === req.user.full_name) return { user: req.user._id, full_name: req.user.full_name, role: 'admin' };
        return { full_name: m, role: 'member' };
      }
      // If it's an object from the frontend
      const uId = m.user?._id || m.user || m.id;
      const fName = m.full_name || m.user?.full_name || 'Member';
      return { 
        user: mongoose.Types.ObjectId.isValid(uId) ? uId : undefined, 
        full_name: fName, 
        role: m.role || 'member', 
        is_active: m.is_active !== undefined ? m.is_active : true 
      };
    });
  }

  const group = await Group.findByIdAndUpdate(
    req.params.group_id,
    { $set: update },
    { new: true }
  ).populate('members.user', 'full_name avatar_url');
  
  res.json({ group });
}));

// ── Delete group ──────────────────────────────────────────────────
router.delete('/:group_id', requireGroupAdmin, asyncHandler(async (req, res) => {
  await Group.findByIdAndUpdate(req.params.group_id, { is_archived: true });
  res.json({ message: 'Group archived successfully' });
}));

// ── Regenerate invite code ─────────────────────────────────────────
router.post('/:group_id/invite', requireGroupAdmin, asyncHandler(async (req, res) => {
  const newCode = Math.random().toString(36).substring(2, 10);
  const group = await Group.findByIdAndUpdate(
    req.params.group_id,
    { invite_code: newCode },
    { new: true }
  );
  res.json({ invite_code: group.invite_code, invite_url: `${process.env.APP_URL}/join/${group.invite_code}` });
}));

// ── Join group via invite code ────────────────────────────────────
router.post('/join/:invite_code', asyncHandler(async (req, res) => {
  const group = await Group.findOne({ invite_code: req.params.invite_code, is_archived: false });
  if (!group) throw new AppError('Invalid or expired invite code', 404);

  const memberIndex = group.members.findIndex(m => m?.user?.toString?.() === req?.user?.id?.toString?.());
  
  if (memberIndex > -1) {
    group.members[memberIndex].is_active = true;
  } else {
    group.members.push({ user: req.user.id, role: 'member' });
  }

  await group.save();
  res.json({ message: `Joined "${group.name}" successfully`, group });
}));

// ── Leave group ───────────────────────────────────────────────────
router.delete('/:group_id/leave', requireGroupMember, asyncHandler(async (req, res) => {
  const member = req.group.members.find(m => m?.user?.toString?.() === req?.user?.id?.toString?.());
  if (member) {
    member.is_active = false;
    await req.group.save();
  }
  res.json({ message: 'Left group successfully' });
}));

// ── List group members ────────────────────────────────────────────
router.get('/:group_id/members', requireGroupMember, asyncHandler(async (req, res) => {
  const balances = await calculateBalances(req.group._id);
  
  const members = await Promise.all(req.group.members.filter(m => m.is_active).map(async (m) => {
    const user = await User.findById(m.user, 'full_name avatar_url upi_id');
    const uId = user?._id || m.user;
    return {
      id: uId,
      full_name: user?.full_name || m.full_name || 'Member',
      avatar_url: user?.avatar_url,
      upi_id: user?.upi_id,
      role: m.role,
      joined_at: m.joined_at,
      net_balance: balances.net[uId] || 0,
      total_paid: balances.paid[uId] || 0,
      total_owed: balances.owed[uId] || 0
    };
  }));

  res.json({ members });
}));

// ── Update member role ────────────────────────────────────────────
router.patch('/:group_id/members/:user_id', requireGroupAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin','member'].includes(role)) throw new AppError('Role must be admin or member', 400);
  
  const member = req.group.members.find(m => m?.user?.toString?.() === req?.params?.user_id?.toString?.() && m.is_active);
  if (!member) throw new AppError('Member not found', 404);
  
  member.role = role;
  await req.group.save();
  
  res.json({ message: 'Member role updated' });
}));

// ── Remove member (admin) ─────────────────────────────────────────
router.delete('/:group_id/members/:user_id', requireGroupAdmin, asyncHandler(async (req, res) => {
  const member = req.group.members.find(m => m?.user?.toString?.() === req?.params?.user_id?.toString?.() && m.is_active);
  if (member) {
    member.is_active = false;
    await req.group.save();
  }
  res.json({ message: 'Member removed' });
}));

module.exports = router;

module.exports = router;
