const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { is_read: true },
      { new: true }
    );
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, is_read: false },
      { is_read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all notifications
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
