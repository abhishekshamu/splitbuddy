require('dotenv').config();
const jwt = require('jsonwebtoken');

async function run() {
  const token = jwt.sign({ id: "6a5b38dd9b320e675cd84a49" }, process.env.JWT_SECRET || 'yoursupersecretjwtkeyhere', { expiresIn: '1h' });
  try {
    const res = await fetch('http://localhost:5000/api/expenses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch(e) {
    console.error(e);
  }
}
run();
