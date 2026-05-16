const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  paid_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  paid_by_name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  category: {
    type: String,
    default: 'other',
    enum: [
      'rent', 'electricity', 'wifi', 'grocery', 'food',
      'gas', 'cleaning', 'water', 'travel', 'entertainment', 'other'
    ]
  },
  split_type: {
    type: String,
    default: 'equal',
    enum: ['equal', 'custom', 'percent', 'share']
  },
  receipt_url: String,
  expense_date: {
    type: Date,
    default: Date.now
  },
  splits: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    full_name: {
      type: String,
      required: true
    },
    owed_amount: {
      type: Number,
      required: true,
      min: 0
    },
    percent: Number,
    shares: Number,
    is_settled: {
      type: Boolean,
      default: false
    },
    settled_at: Date
  }],
  is_deleted: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

ExpenseSchema.index({ group: 1, expense_date: -1 });
ExpenseSchema.index({ paid_by: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
