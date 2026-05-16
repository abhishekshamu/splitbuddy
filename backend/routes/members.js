const router = require('express').Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Search users by email or name (for adding to groups)
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });

  const users = await User.find({
    $and: [
      {
        $or: [
          { full_name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      },
      { _id: { $ne: req.user.id } }
    ]
  }).select('full_name email avatar_url upi_id').limit(10);

  res.json({ users });
}));

// Get user by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('full_name email avatar_url upi_id created_at');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}));

module.exports = router;
