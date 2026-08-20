require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function resetPassword() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const newPassword = 'SplitBuddy@2026';
  const hash = await bcrypt.hash(newPassword, 10);
  
  const result = await mongoose.connection.collection('users').updateOne(
    { email: 'alphabhiee@gmail.com' },
    { $set: { password: hash } }
  );
  
  console.log('Updated:', result.modifiedCount, 'user(s)');
  console.log('New password is: SplitBuddy@2026');
  
  await mongoose.disconnect();
}

resetPassword();
