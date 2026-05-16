const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {String} userId - Recipient ID
 * @param {String} type - Notification type (expense, settle, budget, etc.)
 * @param {String} title - Notification title
 * @param {String} body - Detailed message
 * @param {Object} data - Optional additional metadata
 */
exports.createNotification = async (userId, type, title, body, data = {}) => {
  try {
    const notif = new Notification({
      user: userId,
      type,
      title,
      body,
      data
    });
    await notif.save();
    return notif;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

/**
 * Create notifications for multiple users
 * @param {Array} userIds - List of recipient IDs
 * @param {String} type 
 * @param {String} title 
 * @param {String} body 
 * @param {Object} data 
 */
exports.notifyUsers = async (userIds, type, title, body, data = {}) => {
  try {
    const notifs = userIds.map(uid => ({
      user: uid,
      type,
      title,
      body,
      data
    }));
    await Notification.insertMany(notifs);
  } catch (err) {
    console.error('Error notifying users:', err);
  }
};
