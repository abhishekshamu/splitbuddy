const mongoose = require('mongoose');

const PaymentDueSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  due_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'paid', 'overdue']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PaymentDue', PaymentDueSchema);
