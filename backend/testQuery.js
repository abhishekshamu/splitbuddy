const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Group = require('./models/Group');

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const userId = "6a5b38dd9b320e675cd84a49";
    
    console.log('Querying...');
    const groups = await Group.find({
      'members.user': userId,
      'members.is_active': true,
      is_archived: false
    });
    console.log(`Found ${groups.length} groups.`);
    
    // what if we query just with the user id?
    const groups2 = await Group.find({ 'members.user': userId });
    console.log(`Found ${groups2.length} groups with just user ID.`);
    
    // what if we query is_archived?
    const groups3 = await Group.find({});
    console.log("Archive status of groups:", groups3.map(g => g.is_archived));
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

testQuery();
