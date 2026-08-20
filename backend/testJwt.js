require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function checkTokenAndUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // The JWT_SECRET being used
  const secret = process.env.JWT_SECRET || 'yoursupersecretjwtkeyhere';
  console.log("JWT_SECRET set?", !!process.env.JWT_SECRET);
  console.log("Using secret:", process.env.JWT_SECRET ? "[from .env]" : "fallback 'yoursupersecretjwtkeyhere'");
  
  // Let's generate a token for the ABHISHEK user (PROD user)
  const prodUserId = "6a376eddb5103bc01caadcaf";
  const testUserId = "6a5b38dd9b320e675cd84a49"; // this was the test DB user
  
  const prodToken = jwt.sign({ id: prodUserId }, secret, { expiresIn: '30d' });
  const testToken = jwt.sign({ id: testUserId }, secret, { expiresIn: '30d' });
  
  console.log("\n--- Prod Token (ABHISHEK alphabhiee@gmail.com) ---");
  console.log("Token (first 50):", prodToken.slice(0, 50));
  
  console.log("\n--- Test token (Abhi - test DB user, NO LONGER EXISTS) ---");
  console.log("Token (first 50):", testToken.slice(0, 50));

  // Try to find the test user  
  const User = require('./models/User');
  const testUser = await User.findById(testUserId);
  console.log("\nTest user exists in splitbuddy DB?", !!testUser);
  
  const prodUser = await User.findById(prodUserId);
  console.log("Prod user exists in splitbuddy DB?", !!prodUser, prodUser?.email);
  
  // Verify both tokens
  try { const d = jwt.verify(prodToken, secret); console.log("\nprodToken valid, id:", d.id); } catch(e) { console.log("prodToken INVALID:", e.message); }
  try { const d = jwt.verify(testToken, secret); console.log("testToken valid, id:", d.id, "(but user won't be found in DB)"); } catch(e) { console.log("testToken INVALID:", e.message); }

  await mongoose.disconnect();
}

checkTokenAndUser();
