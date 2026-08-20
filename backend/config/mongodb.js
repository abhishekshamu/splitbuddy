const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Error connecting to MongoDB: ${err.message}`);
    if (err.message.includes('querySrv ECONNREFUSED')) {
      console.error('💡 TIP: This is usually a DNS issue. Try using the "Standard Connection String" (mongodb://...) instead of the SRV one (mongodb+srv://...) in your .env file.');
    }
    console.warn('⚠️ Server will continue running without MongoDB, but database-dependent routes will fail until reconnected.');
  }
};

module.exports = connectDB;
