const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('groups').deleteMany({
    name: { $regex: /^Test Group \d+$/ }
  });
  console.log(`Deleted ${result.deletedCount} test groups.`);
  await mongoose.disconnect();
}

cleanup();
