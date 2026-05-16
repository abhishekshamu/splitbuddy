const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  emoji: {
    type: String,
    default: '🏠'
  },
  type: {
    type: String,
    default: 'flatmates',
    enum: ['flatmates', 'trip', 'hostel', 'office', 'friends', 'family', 'custom']
  },
  invite_code: {
    type: String,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 10)
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Allow non-registered members
    },
    full_name: {
      type: String,
      required: true // Every member must have a name
    },
    role: {
      type: String,
      default: 'member',
      enum: ['admin', 'member']
    },
    nickname: String,
    joined_at: {
      type: Date,
      default: Date.now
    },
    is_active: {
      type: Boolean,
      default: true
    }
  }],
  monthly_budget: {
    type: Number,
    default: 0
  },
  budget_history: [{
    month: String,
    year: Number,
    budget: Number,
    spent: Number
  }],
  invite_code: {
    type: String,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 10)
  },
  currency: {
    type: String,
    default: 'INR'
  },
  is_archived: {
    type: Boolean,
    default: false
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

// Index for group members lookup
GroupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', GroupSchema);
