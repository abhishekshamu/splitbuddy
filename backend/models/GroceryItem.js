const mongoose = require('mongoose');

const GroceryItemSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  added_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: String,
  estimated_price: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    default: 'Other'
  },
  is_checked: {
    type: Boolean,
    default: false
  },
  checked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  checked_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GroceryItem', GroceryItemSchema);
