const mongoose = require('mongoose');

const SharedLinkSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Other'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SharedLink', SharedLinkSchema);
