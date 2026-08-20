const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'SplitBuddy.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the corrupted replacement character (U+FFFD) in the toast message with a plain hyphen
const before = content.length;
content = content.replace(
  "toast.error('Session expired \uFFFD please log in again.');",
  "toast.error('Session expired - please log in again.');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed. Chars before:', before, 'after:', content.length);
console.log('Verify fix:', content.includes('Session expired - please log in again.'));
