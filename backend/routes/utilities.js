const router = require('express').Router();
const GroceryItem  = require('../models/GroceryItem');
const Chore        = require('../models/Chore');
const Reminder     = require('../models/Reminder');
const RoomNote     = require('../models/RoomNote');
const SharedLink   = require('../models/SharedLink');
const PaymentDue   = require('../models/PaymentDue');
const Activity     = require('../models/Activity');
const Group        = require('../models/Group');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const logActivity = require('../config/activityLogger');
const { createNotification, notifyUsers } = require('../utils/notificationHelper');

// ═══════════════ GROCERY ═══════════════════════════════════════════

router.get('/grocery/:group_id', asyncHandler(async (req, res) => {
  const items = await GroceryItem.find({ group: req.params.group_id })
    .populate('added_by', 'full_name')
    .sort({ is_checked: 1, created_at: -1 });

  res.json({ items });
}));

router.post('/grocery', asyncHandler(async (req, res) => {
  const { group_id, name, quantity, estimated_price, category } = req.body;
  if (!group_id || !name) throw new AppError('group_id and name required', 400);
  
  const item = await GroceryItem.create({
    group: group_id,
    added_by: req.user.id,
    name,
    quantity,
    estimated_price,
    category
  });
  
  await logActivity(group_id, req.user.id, 'grocery', 'added', name);
  
  const group = await Group.findById(group_id);
  const otherMembers = group.members.filter(m => m.user && m.user.toString() !== req.user.id.toString()).map(m => m.user);
  await notifyUsers(otherMembers, 'grocery', 'Grocery Added', `${req.user.full_name} added ${name} to the list`, { item_id: item._id, group_id });
  res.status(201).json({ item });
}));

router.patch('/grocery/:id', asyncHandler(async (req, res) => {
  const item = await GroceryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ item });
}));

router.patch('/grocery/:id/toggle', asyncHandler(async (req, res) => {
  const item = await GroceryItem.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  
  item.is_checked = !item.is_checked;
  item.checked_by = item.is_checked ? req.user.id : null;
  item.checked_at = item.is_checked ? new Date() : null;
  await item.save();
  
  await logActivity(item.group, req.user.id, 'grocery', item.is_checked ? 'purchased' : 'unmarked', item.name);
  res.json({ item });
}));

router.delete('/grocery/:id', asyncHandler(async (req, res) => {
  const item = await GroceryItem.findByIdAndDelete(req.params.id);
  if (item) await logActivity(item.group, req.user.id, 'grocery', 'deleted', item.name);
  res.json({ message: 'Item deleted' });
}));

// ═══════════════ CHORES ════════════════════════════════════════════

router.get('/chores/:group_id', asyncHandler(async (req, res) => {
  const chores = await Chore.find({ group: req.params.group_id })
    .populate('assigned_to', 'full_name avatar_url')
    .sort({ due_date: 1 });

  res.json({ chores: chores.map(c => ({
    ...c.toObject(),
    assigned_name: c.assigned_to?.full_name || 'Someone',
    avatar_url: c.assigned_to?.avatar_url
  })) });
}));

router.post('/chores', asyncHandler(async (req, res) => {
  const { group_id, name, assigned_to, due_date, priority, description } = req.body;
  
  const chore = await Chore.create({
    group: group_id,
    name,
    assigned_to,
    due_date,
    priority,
    description
  });
  
  await logActivity(group_id, req.user.id, 'chore', 'assigned', name);
  
  if (assigned_to) {
    await createNotification(assigned_to, 'chore', 'Chore Assigned', `You've been assigned: ${name}`, { chore_id: chore._id, group_id });
  }
  res.status(201).json({ chore });
}));

router.patch('/chores/:id', asyncHandler(async (req, res) => {
  const chore = await Chore.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).populate('assigned_to', 'full_name');
  if (req.body.status === 'done') await logActivity(chore.group, req.user.id, 'chore', 'completed', chore.name);
  res.json({ chore });
}));

router.post('/chores/:group_id/rotate', asyncHandler(async (req, res) => {
  const chores = await Chore.find({ group: req.params.group_id, status: { $ne: 'done' } });
  const group = await Group.findById(req.params.group_id);
  const members = group.members.filter(m => m.is_active).map(m => m.user.toString());

  if (members.length < 2) return res.status(400).json({ message: 'Not enough members to rotate' });

  for (let c of chores) {
    const curIdx = members.indexOf(c.assigned_to.toString());
    const nextIdx = (curIdx + 1) % members.length;
    c.assigned_to = members[nextIdx];
    await c.save();
  }
  
  await logActivity(req.params.group_id, req.user.id, 'chore', 'rotated', 'all active tasks');
  res.json({ message: 'Chores rotated' });
}));

router.delete('/chores/:id', asyncHandler(async (req, res) => {
  await Chore.findByIdAndDelete(req.params.id);
  res.json({ message: 'Chore deleted' });
}));

// ═══════════════ REMINDERS ═════════════════════════════════════════

router.get('/reminders/:group_id', asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ group: req.params.group_id }).sort({ due_date: 1 });
  res.json({ reminders });
}));

router.post('/reminders', asyncHandler(async (req, res) => {
  const reminder = await Reminder.create({ ...req.body, created_by: req.user.id, group: req.body.group_id });
  await logActivity(req.body.group_id, req.user.id, 'reminder', 'added', req.body.title);
  res.status(201).json({ reminder });
}));

router.patch('/reminders/:id', asyncHandler(async (req, res) => {
  const reminder = await Reminder.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  res.json({ reminder });
}));

router.patch('/reminders/:id/toggle', asyncHandler(async (req, res) => {
  const r = await Reminder.findById(req.params.id);
  r.is_completed = !r.is_completed;
  await r.save();
  await logActivity(r.group, req.user.id, 'reminder', r.is_completed ? 'completed' : 'reactivated', r.title);
  res.json({ reminder: r });
}));

router.delete('/reminders/:id', asyncHandler(async (req, res) => {
  await Reminder.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

// ═══════════════ NOTES ════════════════════════════════════════════

router.get('/notes/:group_id', asyncHandler(async (req, res) => {
  const notes = await RoomNote.find({ group: req.params.group_id }).populate('created_by', 'full_name').sort({ is_pinned: -1, created_at: -1 });
  res.json({ notes: notes.map(n => ({ ...n.toObject(), author: n.created_by?.full_name || 'Someone' })) });
}));

router.post('/notes', asyncHandler(async (req, res) => {
  const note = await RoomNote.create({ ...req.body, created_by: req.user.id, group: req.body.group_id });
  await logActivity(req.body.group_id, req.user.id, 'note', 'pinned', req.body.title);
  res.status(201).json({ note });
}));

router.patch('/notes/:id', asyncHandler(async (req, res) => {
  const note = await RoomNote.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  res.json({ note });
}));

router.delete('/notes/:id', asyncHandler(async (req, res) => {
  await RoomNote.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

// ═══════════════ SHARED LINKS ═════════════════════════════════════

router.get('/links/:group_id', asyncHandler(async (req, res) => {
  const links = await SharedLink.find({ group: req.params.group_id }).sort({ created_at: -1 });
  res.json({ links });
}));

router.post('/links', asyncHandler(async (req, res) => {
  const link = await SharedLink.create({ ...req.body, created_by: req.user.id, group: req.body.group_id });
  await logActivity(req.body.group_id, req.user.id, 'link', 'shared', req.body.title || req.body.url);
  res.status(201).json({ link });
}));

router.delete('/links/:id', asyncHandler(async (req, res) => {
  const link = await SharedLink.findByIdAndDelete(req.params.id);
  if (link) await logActivity(link.group, req.user.id, 'link', 'removed', link.title || link.url);
  res.json({ message: 'Deleted' });
}));

// ═══════════════ PAYMENT DUES ═════════════════════════════════════

router.get('/payments/:group_id', asyncHandler(async (req, res) => {
  const payments = await PaymentDue.find({ group: req.params.group_id }).sort({ due_date: 1 });
  res.json({ payments });
}));

router.post('/payments', asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const payment = await PaymentDue.create({ ...req.body, amount, group: req.body.group_id });
  await logActivity(req.body.group_id, req.user.id, 'payment', 'added', req.body.title);
  
  // Notify all group members
  const group = await Group.findById(req.body.group_id);
  if (group) {
    const currentUserId = req?.user?.id?.toString?.() || req?.user?._id?.toString?.();
    const others = (group?.members || [])
      .filter(m => m?.user?.toString?.() && m?.user?.toString?.() !== currentUserId)
      .map(m => m.user);
      
    if (others.length > 0) {
      await notifyUsers(others, 'reminder', 'Payment Due Added', `A new bill "${req.body.title}" for ₹${amount} is due by ${new Date(req.body.due_date).toLocaleDateString()}`);
    }
  }
  
  res.status(201).json({ payment });
}));

router.patch('/payments/:id', asyncHandler(async (req, res) => {
  const payment = await PaymentDue.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (req.body.status === 'paid') await logActivity(payment.group, req.user.id, 'payment', 'cleared', payment.title);
  res.json({ payment });
}));

router.delete('/payments/:id', asyncHandler(async (req, res) => {
  await PaymentDue.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
}));

// ═══════════════ ACTIVITY FEED ════════════════════════════════════

router.get('/activities/:group_id', asyncHandler(async (req, res) => {
  const activities = await Activity.find({ group: req.params.group_id }).sort({ created_at: -1 }).limit(20);
  res.json({ activities });
}));

// ═══════════════ BUDGET ════════════════════════════════════════════

router.post('/groups/:id/budget/archive', asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  const { spent } = req.body;
  
  const now = new Date();
  group.budget_history.push({
    month: now.toLocaleString('default', { month: 'long' }),
    year: now.getFullYear(),
    budget: group.monthly_budget,
    spent: spent || 0
  });
  
  await group.save();
  res.json({ group });
}));


module.exports = router;
