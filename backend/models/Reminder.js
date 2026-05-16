const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    default: 'custom',
    enum: ['rent', 'electricity', 'gas', 'custom']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  priority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high']
  },
  repeat: {
    type: String,
    default: 'none',
    enum: ['none', 'daily', 'weekly', 'monthly']
  },
  amount: Number,
  due_day: {
    type: Number,
    min: 1,
    max: 31
  },
  due_date: Date,
  is_active: {
    type: Boolean,
    default: true
  },
  is_completed: {
    type: Boolean,
    default: false
  },
  last_sent_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reminder', ReminderSchema);
