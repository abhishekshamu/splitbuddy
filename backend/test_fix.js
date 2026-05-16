const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Group = require('./models/Group');
const User = require('./models/User');
const Settlement = require('./models/Settlement');
require('dotenv').config();

const testNewSettleLogic = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ full_name: /abhishek/i });
    if (!user) return;

    const group_id = 'all';
    let match = { is_deleted: false };
    const userGroups = await Group.find({ 'members.user': user._id, 'members.is_active': true }, '_id');
    match.group = { $in: userGroups.map(g => g._id) };

    const paidResult = await Expense.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$paid_by', '$paid_by_name'] }, total: { $sum: '$amount' } } }
    ]);
    const owedResult = await Expense.aggregate([
      { $match: match },
      { $unwind: '$splits' },
      { $group: { _id: { $ifNull: ['$splits.user', '$splits.full_name'] }, total: { $sum: '$splits.owed_amount' } } }
    ]);

    const paidMap = Object.fromEntries(paidResult.map(r => [r._id?.toString(), r.total]));
    const owedMap = Object.fromEntries(owedResult.map(r => [r._id?.toString(), r.total]));

    const groups = await Group.find({ 'members.user': user._id, 'members.is_active': true }).populate('members.user', 'full_name');
    const memberMap = new Map();
    groups.forEach(g => {
      g.members.forEach(m => {
        const key = (m.user?._id || m.user || m._id).toString();
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: m.user?._id || m._id,
            full_name: m.full_name || m.user?.full_name,
            user_id: m.user?._id,
            member_id: m._id
          });
        }
      });
    });
    const members = Array.from(memberMap.values());

    console.log('--- TEST RESULTS ---');
    members.forEach(m => {
      const uKey = m.user_id?.toString();
      const mKey = m.member_id?.toString();
      const nKey = m.full_name;

      const paid = (uKey && paidMap[uKey]) || (mKey && paidMap[mKey]) || paidMap[nKey] || 0;
      const owed = (uKey && owedMap[uKey]) || (mKey && owedMap[mKey]) || owedMap[nKey] || 0;
      const net = paid - owed;

      console.log(`${m.full_name.padEnd(10)} | Paid: ${String(paid).padStart(8)} | Owed: ${String(owed).padStart(8)} | Net: ${net.toFixed(2)}`);
    });

    mongoose.disconnect();
  } catch (err) { console.error(err); }
};

testNewSettleLogic();
