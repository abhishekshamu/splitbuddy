/**
 * Fix: Set creator's role to 'admin' for all groups where created_by exists
 * but the creator's member role is still 'member'
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./models/Group');

async function fixAdminRoles() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const groups = await Group.find({});
  let fixed = 0;

  for (const group of groups) {
    if (!group.created_by) continue;

    const creatorMember = group.members.find(m => {
      const uId = m.user?._id || m.user;
      return uId && uId.toString() === group.created_by.toString();
    });

    if (creatorMember && creatorMember.role !== 'admin') {
      await Group.updateOne(
        { _id: group._id, 'members._id': creatorMember._id },
        { $set: { 'members.$.role': 'admin' } }
      );
      console.log(`Fixed: Group "${group.name}" (${group._id}) — set ${creatorMember.full_name} to admin`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} group(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

fixAdminRoles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
