const fs = require('fs');
let code = fs.readFileSync('frontend/src/SplitBuddy.jsx', 'utf8');

// Find Reports component boundaries
const startMarker = 'function Reports({ nav, openModal }) {';
const endMarker = '\n\nfunction SmartBudget';
const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find Reports boundaries', startIdx, endIdx);
  process.exit(1);
}

const newReports = fs.readFileSync('frontend/src/newReports.jsx', 'utf8');
code = code.substring(0, startIdx) + newReports + code.substring(endIdx);
fs.writeFileSync('frontend/src/SplitBuddy.jsx', code);
console.log('Reports replaced');
