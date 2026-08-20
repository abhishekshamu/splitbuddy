require('dotenv').config();
const jwt = require('jsonwebtoken');

// Test creating a group as the main user (ABHISHEK, id: 6a376eddb5103bc01caadcaf)
async function testCreateGroup() {
  const userId = "6a376eddb5103bc01caadcaf";
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'yoursupersecretjwtkeyhere', { expiresIn: '1h' });
  
  console.log("Token:", token.substring(0, 30) + "...");
  
  const payload = {
    name: "Test Group " + Date.now(),
    emoji: "🏠",
    type: "flatmates",
    color: "#9b6dff",
    visibility: "private",
    members: []
  };
  
  console.log("Payload:", JSON.stringify(payload));
  
  try {
    const res = await fetch('http://localhost:5000/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}

testCreateGroup();
