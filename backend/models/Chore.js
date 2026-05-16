const mongoose = require('mongoose');

const ChoreSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  emoji: {
    type: String,
    default: '🧹'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  due_date: Date,
  description: String,
  priority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high']
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'in-progress', 'done', 'skipped']
  },
  recurrence: {
    type: String,
    default: 'weekly'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Chore', ChoreSchema);
