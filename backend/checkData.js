const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('--- USERS ---');
    const users = await mongoose.connection.collection('users').find({}).toArray();
    users.forEach(u => console.log(`ID: ${u._id} | Name: ${u.full_name} | Email: ${u.email}`));
    
    console.log('\n--- GROUPS ---');
    const groups = await mongoose.connection.collection('groups').find({}).toArray();
    groups.forEach(g => {
      console.log(`Group ID: ${g._id} | Name: ${g.name} | Created By: ${g.created_by}`);
      g.members.forEach(m => console.log(`  Member User ID: ${m.user} | Name: ${m.full_name}`));
    });

    console.log('\n--- EXPENSES ---');
    const expenses = await mongoose.connection.collection('expenses').find({}).toArray();
    console.log(`Found ${expenses.length} expenses.`);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkData();
