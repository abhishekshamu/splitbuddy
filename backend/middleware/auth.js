const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token locally
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Fetch our MongoDB user record
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if user is group admin
const requireGroupAdmin = async (req, res, next) => {
  try {
    const group_id = req.params.group_id || req.body.group_id;
    const group = await Group.findById(group_id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = group.members.find(m => {
      const uId = m.user?._id || m.user;
      return uId && uId.toString() === req.user.id.toString() && m.is_active;
    });
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.group = group; // Pass group to next middleware/handler
    next();
  } catch (err) {
    next(err);
  }
};

// Check if user is a member of the group
const requireGroupMember = async (req, res, next) => {
  try {
    const group_id = req.params.group_id || req.body.group_id;
    const group = await Group.findById(group_id).populate('members.user', 'full_name avatar_url');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => {
      const uId = m.user?._id || m.user;
      return uId && uId.toString() === req.user.id.toString() && m.is_active;
    });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    req.group = group; // Pass group to next middleware/handler
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireGroupAdmin, requireGroupMember };
