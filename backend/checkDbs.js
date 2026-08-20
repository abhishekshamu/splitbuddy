const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function checkDatabases() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.client.db('splitbuddy');
    
    const users = await db.collection('users').find({}).toArray();
    console.log("Users in splitbuddy DB:");
    users.forEach(u => console.log(`ID: ${u._id} | Name: ${u.full_name} | Email: ${u.email}`));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkDatabases();
