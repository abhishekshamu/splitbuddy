const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_name: String,
  type: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  item_name: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', ActivitySchema);
