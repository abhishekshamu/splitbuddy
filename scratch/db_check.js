const mongoose = require('mongoose');
const Group = require('./backend/models/Group');
const Expense = require('./backend/models/Expense');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const groups = await Group.find();
  console.log('--- Groups ---');
  groups.forEach(g => {
    console.log(`Group: ${g.name}, Members: ${g.members.length}`);
    g.members.forEach(m => console.log(`  - ${m.full_name} (User ID: ${m.user}, Active: ${m.is_active})`));
  });

  const expenses = await Expense.find({ is_deleted: false });
  console.log('--- Expenses ---');
  expenses.forEach(e => {
    console.log(`Expense: ${e.title}, Amount: ${e.amount}, Paid By: ${e.paid_by_name}`);
    console.log(`  Splits: ${e.splits.length}`);
    e.splits.forEach(s => console.log(`    - ${s.full_name}: ${s.owed_amount}`));
  });

  process.exit();
}
check();
