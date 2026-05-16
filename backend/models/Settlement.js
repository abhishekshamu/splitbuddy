const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  from_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  from_name: {
    type: String,
    required: true
  },
  to_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  to_name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  method: {
    type: String,
    default: 'upi'
  },
  upi_ref: String,
  screenshot_url: String,
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'confirmed', 'disputed', 'completed']
  },
  note: String,
  settled_at: {
    type: Date,
    default: Date.now
  },
  confirmed_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

SettlementSchema.index({ group: 1 });
SettlementSchema.index({ from_user: 1 });
SettlementSchema.index({ to_user: 1 });

module.exports = mongoose.model('Settlement', SettlementSchema);
