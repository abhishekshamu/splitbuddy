const Activity = require('../models/Activity');
const User = require('../models/User');

/**
 * Logs a group activity
 * @param {string} groupId - ID of the group
 * @param {string} userId - ID of the user performing the action
 * @param {string} type - Type of activity (expense, settlement, grocery, etc)
 * @param {string} action - Action performed (added, settled, completed, etc)
 * @param {string} itemName - Name of the item (expense title, grocery name, etc)
 */
const logActivity = async (groupId, userId, type, action, itemName) => {
  try {
    const user = await User.findById(userId);
    await Activity.create({
      group: groupId,
      user: userId,
      user_name: user?.full_name || 'Someone',
      type,
      action,
      item_name: itemName
    });
  } catch (err) {
    console.error('Activity Log Error:', err);
  }
};

module.exports = logActivity;
