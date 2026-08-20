const mongoose = require('mongoose');

// The original URI (test database)
const TEST_DB_URI = 'mongodb://mrabhishekshamu_db_user:Alpha123@ac-ywkdj4y-shard-00-00.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-01.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-02.zbtl7zo.mongodb.net:27017/?ssl=true&replicaSet=atlas-6qbaly-shard-0&authSource=admin&appName=splitbuddy';
// The new URI (splitbuddy database)
const PROD_DB_URI = 'mongodb://mrabhishekshamu_db_user:Alpha123@ac-ywkdj4y-shard-00-00.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-01.zbtl7zo.mongodb.net:27017,ac-ywkdj4y-shard-00-02.zbtl7zo.mongodb.net:27017/splitbuddy?ssl=true&replicaSet=atlas-6qbaly-shard-0&authSource=admin&appName=splitbuddy';

const TEST_USER_ID = new mongoose.Types.ObjectId("6a5b38dd9b320e675cd84a49");
const PROD_USER_ID = new mongoose.Types.ObjectId("6a376eddb5103bc01caadcaf");

async function runMigration() {
  let testConn, prodConn;
  try {
    console.log("Connecting to TEST database...");
    testConn = await mongoose.createConnection(TEST_DB_URI).asPromise();
    
    console.log("Connecting to PROD database...");
    prodConn = await mongoose.createConnection(PROD_DB_URI).asPromise();
    
    const testGroups = await testConn.collection('groups').find({}).toArray();
    console.log(`Found ${testGroups.length} groups in TEST db.`);
    
    const testExpenses = await testConn.collection('expenses').find({}).toArray();
    console.log(`Found ${testExpenses.length} expenses in TEST db.`);
    
    // 1. Migrate Groups
    if (testGroups.length > 0) {
      for (let g of testGroups) {
        // Update user IDs in group
        if (g.created_by && g.created_by.toString() === TEST_USER_ID.toString()) {
          g.created_by = PROD_USER_ID;
        }
        if (g.budget_updated_by && g.budget_updated_by.toString() === TEST_USER_ID.toString()) {
          g.budget_updated_by = PROD_USER_ID;
        }
        g.members = g.members.map(m => {
          if (m.user && m.user.toString() === TEST_USER_ID.toString()) {
            m.user = PROD_USER_ID;
          }
          return m;
        });
        
        // Insert into prod if doesn't exist
        const existing = await prodConn.collection('groups').findOne({ _id: g._id });
        if (!existing) {
          await prodConn.collection('groups').insertOne(g);
          console.log(`Migrated group: ${g.name}`);
        } else {
          console.log(`Group ${g.name} already exists in prod.`);
        }
      }
    }
    
    // 2. Migrate Expenses
    if (testExpenses.length > 0) {
      for (let e of testExpenses) {
        if (e.created_by && e.created_by.toString() === TEST_USER_ID.toString()) {
          e.created_by = PROD_USER_ID;
        }
        if (e.paid_by && e.paid_by.toString() === TEST_USER_ID.toString()) {
          e.paid_by = PROD_USER_ID;
        }
        if (e.splits) {
          e.splits = e.splits.map(s => {
            if (s.user && s.user.toString() === TEST_USER_ID.toString()) {
              s.user = PROD_USER_ID;
            }
            return s;
          });
        }
        
        const existing = await prodConn.collection('expenses').findOne({ _id: e._id });
        if (!existing) {
          await prodConn.collection('expenses').insertOne(e);
          console.log(`Migrated expense: ${e.title}`);
        } else {
          console.log(`Expense ${e.title} already exists in prod.`);
        }
      }
    }
    
    // 3. Clean up Test database
    console.log("Cleaning up TEST database...");
    await testConn.dropDatabase();
    console.log("Dropped TEST database successfully.");
    
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    if (testConn) await testConn.close();
    if (prodConn) await prodConn.close();
  }
}

runMigration();
