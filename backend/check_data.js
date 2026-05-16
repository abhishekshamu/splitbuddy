const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Group = require('./models/Group');
const Settlement = require('./models/Settlement');
require('dotenv').config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const expenses = await Expense.find({ is_deleted: false });
    console.log(`Found ${expenses.length} expenses`);
    expenses.forEach(e => {
      console.log(`Expense: ${e.title}, Amount: ${e.amount}, Group: ${e.group}, PaidBy: ${e.paid_by}, PaidByName: ${e.paid_by_name}`);
      console.log(`Splits:`, JSON.stringify(e.splits));
    });

    const groups = await Group.find({});
    console.log(`Found ${groups.length} groups`);
    groups.forEach(g => {
      console.log(`Group: ${g.name}, ID: ${g._id}`);
      console.log(`Members:`, JSON.stringify(g.members.map(m => ({ id: m.user || m._id, name: m.full_name }))));
    });

    const settlements = await Settlement.find({ status: 'confirmed' });
    console.log(`Found ${settlements.length} confirmed settlements`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

checkData();
