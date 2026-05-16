const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  full_name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  avatar_url: String,
  upi_id: String,
  password: {
    type: String,
    select: false // Don't return password by default
  },
  auth_id: {
    type: String,
    unique: true,
    sparse: true // No longer required for all
  },
  google_id: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    lang: { type: String, default: 'en' },
    currency: { type: String, default: 'INR' },
    notify_push: { type: Boolean, default: true },
    notify_email: { type: Boolean, default: true },
    dark_mode: { type: Boolean, default: true }
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

module.exports = mongoose.model('User', UserSchema);
