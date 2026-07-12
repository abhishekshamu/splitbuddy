const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Group  = require('../models/Group');
const { authenticate }    = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
};

// ── Register ──────────────────────────────────────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password || !full_name) {
    throw new AppError('email, password and full_name are required', 400);
  }

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 400);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password: hashedPassword,
    full_name,
    phone
  });

  // Link existing guest memberships
  await Group.updateMany(
    { 'members.full_name': full_name, 'members.user': { $exists: false } },
    { $set: { 'members.$.user': user._id } }
  );

  const token = generateToken(user._id);

  res.status(201).json({
    user,
    token,
    session: { access_token: token } // Keep structure for frontend compatibility
  });
}));

// ── Login ─────────────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken(user._id);
  const userObj = user.toObject();
  delete userObj.password;

  res.json({ 
    user: userObj, 
    token,
    session: { access_token: token }
  });
}));

// ── Get current user ──────────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const groups = await Group.find({ 'members.user': user._id, 'members.is_active': true }, '_id');
  const group_ids = groups.map(g => g._id);

  res.json({ user: { ...user.toObject(), group_ids } });
}));

// ── Update profile ────────────────────────────────────────────────
router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const { full_name, phone, upi_id, lang, dark_mode, notify_push, notify_email, currency } = req.body;

  const update = {};
  if (full_name !== undefined) update.full_name = full_name;
  if (phone !== undefined) update.phone = phone;
  if (upi_id !== undefined) update.upi_id = upi_id;
  
  if (lang !== undefined) update['settings.lang'] = lang;
  if (currency !== undefined) update['settings.currency'] = currency;
  if (dark_mode !== undefined) update['settings.dark_mode'] = dark_mode;
  if (notify_push !== undefined) update['settings.notify_push'] = notify_push;
  if (notify_email !== undefined) update['settings.notify_email'] = notify_email;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: update },
    { new: true }
  );

  res.json({ user });
}));

// ── Toggle pinned group ───────────────────────────────────────────
router.post('/me/pin-group', authenticate, asyncHandler(async (req, res) => {
  const { group_id } = req.body;
  if (!group_id) throw new AppError('group_id is required', 400);

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  const pinnedIds = (user.pinned_groups || []).map(id => id.toString());
  let update;

  if (pinnedIds.includes(group_id.toString())) {
    // Unpin
    update = { $pull: { pinned_groups: group_id } };
  } else {
    // Pin
    update = { $addToSet: { pinned_groups: group_id } };
  }

  const updated = await User.findByIdAndUpdate(req.user.id, update, { new: true });
  res.json({ user: updated, pinned_groups: updated.pinned_groups });
}));

// ── User Search ───────────────────────────────────────────────────
router.get('/search', authenticate, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });

  const users = await User.find({
    $or: [
      { full_name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ],
    _id: { $ne: req.user.id }
  }, 'full_name email avatar_url').limit(8);

  res.json({ users });
}));

// ── Change Password ───────────────────────────────────────────────
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6) {
    throw new AppError('Invalid password data', 400);
  }
  const user = await User.findById(req.user.id).select('+password');
  if (!await bcrypt.compare(current_password, user.password)) {
    throw new AppError('Current password is incorrect', 401);
  }
  user.password = await bcrypt.hash(new_password, 10);
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
}));

// ── Delete Account ──────────────────────────────────────────────────
router.delete('/me', authenticate, asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user.id);
  res.json({ success: true, message: 'Account deleted' });
}));

module.exports = router;
