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
const logActivity  = require('../config/activityLogger');

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
  console.log(`[GET /groups] req.user.id: ${req.user.id}, typeof: ${typeof req.user.id}`);
  const groups = await Group.find({
    'members.user': req.user.id,
    'members.is_active': true,
    is_archived: false
  })
  .populate('members.user', 'full_name avatar_url')
  .sort({ created_at: -1 });

  console.log(`[GET /groups] found ${groups.length} groups for user ${req.user.id}`);

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
  const { 
    name, 
    description, 
    emoji = '🏠', 
    type = 'flatmates', 
    color = '#9b6dff', 
    visibility = 'private', 
    avatar_url = '', 
    members: memberNames = [] 
  } = req.body;

  // 1. Group Name Validation
  const nameTrimmed = name?.trim();
  if (!nameTrimmed) {
    throw new AppError('Group name is required', 400);
  }
  if (nameTrimmed.length < 3 || nameTrimmed.length > 50) {
    throw new AppError('Group name must be between 3 and 50 characters', 400);
  }

  // 2. Prevent duplicate group names for this user
  const duplicateNameRegex = new RegExp(`^${nameTrimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
  const duplicateGroup = await Group.findOne({
    name: { $regex: duplicateNameRegex },
    'members.user': req.user._id,
    'members.is_active': true,
    is_archived: false
  });
  if (duplicateGroup) {
    throw new AppError('You already have an active group with this name', 400);
  }

  // 3. Emoji Validation
  const emojiTrimmed = emoji?.trim() || '🏠';

  // 4. Type Validation
  const validTypes = ['flatmates', 'trip', 'hostel', 'office', 'friends', 'family', 'custom'];
  const typeLower = type?.toLowerCase()?.trim() || 'flatmates';
  if (!validTypes.includes(typeLower)) {
    throw new AppError(`Invalid group type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  // 5. Color Validation (Hex format)
  const colorTrimmed = color?.trim() || '#9b6dff';
  if (!/^#[0-9A-F]{6}$/i.test(colorTrimmed)) {
    throw new AppError('Invalid color format. Must be a valid hex color code.', 400);
  }

  // 6. Visibility Validation
  const visibilityLower = visibility?.toLowerCase()?.trim() || 'private';
  if (!['public', 'private'].includes(visibilityLower)) {
    throw new AppError('Visibility must be either public or private', 400);
  }

  // 7. Member Management & Duplicate Checks
  const uniqueMemberIdentifiers = new Set();
  const members = [{
    user: req.user._id,
    full_name: req.user.full_name,
    role: 'admin',
    is_active: true
  }];
  uniqueMemberIdentifiers.add(req.user._id.toString());
  uniqueMemberIdentifiers.add(req.user.full_name.trim().toLowerCase());

  for (const m of memberNames) {
    if (typeof m === 'string') {
      const trimmedName = m.trim();
      if (!trimmedName || trimmedName === "You" || trimmedName.toLowerCase() === req.user.full_name.toLowerCase()) {
        continue;
      }
      
      const lowerName = trimmedName.toLowerCase();
      if (uniqueMemberIdentifiers.has(lowerName)) {
        throw new AppError(`Duplicate member detected: ${trimmedName}`, 400);
      }
      uniqueMemberIdentifiers.add(lowerName);
      members.push({ full_name: trimmedName, role: 'member', is_active: true });
    } else if (m && typeof m === 'object') {
      const uId = m.user?._id || m.user || m.id;
      const fName = m.full_name?.trim();
      
      if (!fName) {
        throw new AppError('Each member must have a full name', 400);
      }
      
      if (uId) {
        if (uId.toString() === req.user._id.toString()) continue;
        if (uniqueMemberIdentifiers.has(uId.toString())) {
          throw new AppError(`Duplicate member detected: ${fName}`, 400);
        }
        uniqueMemberIdentifiers.add(uId.toString());
        members.push({ 
          user: uId, 
          full_name: fName, 
          role: m.role || 'member', 
          is_active: true 
        });
      } else {
        const lowerName = fName.toLowerCase();
        if (uniqueMemberIdentifiers.has(lowerName)) {
          throw new AppError(`Duplicate member detected: ${fName}`, 400);
        }
        uniqueMemberIdentifiers.add(lowerName);
        members.push({ 
          full_name: fName, 
          role: m.role || 'member', 
          is_active: true 
        });
      }
    }
  }

  // 8. Create the Group
  const group = await Group.create({
    name: nameTrimmed,
    description: description?.trim(),
    emoji: emojiTrimmed,
    type: typeLower,
    color: colorTrimmed,
    visibility: visibilityLower,
    avatar_url: avatar_url?.trim(),
    created_by: req.user._id,
    members
  });

  // 9. Log activity
  await logActivity(group._id, req.user.id, 'group', 'created', group.name);

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

// ── Update budget ──────────────────────────────────────────────────
router.put('/:group_id/budget', requireGroupAdmin, asyncHandler(async (req, res) => {
  const { monthly_budget } = req.body;
  
  if (monthly_budget === undefined) {
    return res.status(400).json({ error: "monthly_budget is required" });
  }

  const group = await Group.findByIdAndUpdate(
    req.params.group_id,
    { 
      $set: { 
        monthly_budget: Number(monthly_budget),
        budget_updated_at: new Date(),
        budget_updated_by: req.user._id
      } 
    },
    { new: true }
  ).populate('members.user', 'full_name avatar_url');
  
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  await logActivity(req.params.group_id, req.user._id, 'budget', 'updated', `₹${monthly_budget}`);

  res.json({ group });
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
  if (monthly_budget !== undefined) {
    update.monthly_budget = monthly_budget;
    update.budget_updated_at = new Date();
    update.budget_updated_by = req.user._id;
  }
  if (is_archived !== undefined) update.is_archived = is_archived;

  // Handle members update if provided
  console.log("Groups PATCH payload:", req.body);
  console.log("Groups PATCH update object:", update);
  
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

// ── Add member ──────────────────────────────────────────────────
router.post('/:group_id/members', requireGroupMember, asyncHandler(async (req, res) => {
  const { user_id, full_name, role = 'member' } = req.body;
  const group = req.group;

  // Check if already a member
  const exists = group.members.find(m => 
    (user_id && m.user?.toString() === user_id.toString()) || 
    (!user_id && m.full_name === full_name && m.is_active)
  );
  
  if (exists) {
    if (exists.is_active) throw new AppError('Member already in group', 400);
    exists.is_active = true; // Reactivate
  } else {
    group.members.push({ user: user_id, full_name, role });
  }

  await group.save();
  const populated = await Group.findById(group._id).populate('members.user', 'full_name avatar_url');
  res.json({ group: populated });
}));

// ── Remove member ───────────────────────────────────────────────
router.delete('/:group_id/members/:m_id', requireGroupMember, asyncHandler(async (req, res) => {
  const member = req.group.members.find(m => 
    (m.user?.toString() === req.params.m_id) || 
    (m._id.toString() === req.params.m_id)
  );

  if (!member) throw new AppError('Member not found', 404);
  if (member.role === 'admin' && req.group.members.filter(m => m.role === 'admin' && m.is_active).length === 1) {
    throw new AppError('Cannot remove the last admin', 400);
  }

  member.is_active = false;
  await req.group.save();
  
  res.json({ message: 'Member removed', group: req.group });
}));

module.exports = router;
