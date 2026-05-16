const mongoose = require('mongoose');
const Expense = require('./models/Expense');
require('dotenv').config();

const checkExpenses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const expenses = await Expense.find({ title: /Rent/i, amount: 800 });
    console.log(`Found ${expenses.length} Rent expenses for ₹800`);
    expenses.forEach(e => {
      console.log(`ID: ${e._id}, Group: ${e.group}, PaidBy: ${e.paid_by_name}`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

checkExpenses();
