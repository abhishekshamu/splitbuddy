const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Group = require('./models/Group');
const User = require('./models/User');
require('dotenv').config();

const simulateSettlePlan = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ full_name: /abhishek/i });
    if (!user) {
      console.log('User abhishek not found');
      return;
    }
    console.log(`Simulating for user: ${user.full_name} (${user._id})`);

    const _group_id = 'all';
    let match = { is_deleted: false };
    
    const userGroups = await Group.find({ 'members.user': user._id, 'members.is_active': true }, '_id');
    console.log(`Found ${userGroups.length} groups for user`);
    userGroups.forEach(g => console.log(` - Group ID: ${g._id}`));
    
    match.group = { $in: userGroups.map(g => g._id) };

    const paidResult = await Expense.aggregate([
      { $match: match },
      { $group: { 
          _id: { $ifNull: ['$paid_by', '$paid_by_name'] }, 
          total: { $sum: '$amount' } 
      } }
    ]);
    console.log(`paidResult:`, JSON.stringify(paidResult));

    const owedResult = await Expense.aggregate([
      { $match: match },
      { $unwind: '$splits' },
      { $group: { 
          _id: { $ifNull: ['$splits.user', '$splits.full_name'] }, 
          total: { $sum: '$splits.owed_amount' } 
      } }
    ]);
    console.log(`owedResult:`, JSON.stringify(owedResult));

    const paidMap = Object.fromEntries(paidResult.map(r => [r._id?.toString(), r.total]));
    const owedMap = Object.fromEntries(owedResult.map(r => [r._id?.toString(), r.total]));
    
    console.log('paidMap:', paidMap);
    console.log('owedMap:', owedMap);

    const groups = await Group.find({ 'members.user': user._id, 'members.is_active': true }).populate('members.user', 'full_name avatar_url upi_id');
    const memberMap = new Map();
    groups.forEach(g => {
      g.members.forEach(m => {
        const key = m.user?._id?.toString() || m.full_name;
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: m.user?._id || m._id,
            full_name: m.full_name || m.user?.full_name,
            user_id: m.user?._id
          });
        }
      });
    });
    const members = Array.from(memberMap.values());
    console.log(`Total members across groups: ${members.length}`);

    const balances = members.map(m => {
      const key = m.user_id?.toString() || m.full_name;
      const paid = paidMap[key] || 0;
      const owed = owedMap[key] || 0;
      const net = paid - owed;
      return { name: m.full_name, key, paid, owed, net };
    });

    console.log('Balances:', JSON.stringify(balances, null, 2));

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

simulateSettlePlan();
