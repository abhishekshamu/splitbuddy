const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    const db = client.db('splitbuddy');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error(err);
  } finally {
    await client.close();
  }
}

testConnection();
