const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Group = require('./models/Group');

async function check() {
  await mongoose.connect('mongodb://mrabhishekshamu_db_user:abhishek123@ac-ywkdj4y-shard-00-00.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-01.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-02.zbtl7zo.mongodb.net:27017/splitbuddy?ssl=true&replicaSet=atlas-6qbaly-shard-0&authSource=admin&retryWrites=true&w=majority&appName=splitbuddy');
  console.log("Connected to MongoDB");

  const group = await Group.findOne({ name: 'hostel expenses' }).populate('members.user');
  console.log("Group members:", group.members.map(m => ({ full_name: m.full_name, user: m.user?._id })));

  const expenses = await Expense.find({ group: group._id }).populate('paid_by splits.user');
  console.log("\nExpenses:");
  expenses.forEach(e => {
    console.log(`- ${e.title} | Paid by: ${e.paid_by_name} (${e.paid_by?._id}) | Amount: ${e.amount}`);
    console.log(`  Splits:`, e.splits.map(s => `${s.full_name} (${s.user?._id}) owes ${s.owed_amount}`));
  });

  process.exit(0);
}

check().catch(console.error);
