const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'SplitBuddy.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const OLD = `    return () => window.removeEventListener("popstate", handlePopState);\r\n  }, [isAuth]);`;
const NEW = `    const handleAuthError = () => {\r\n      useAuthStore.getState().logout();\r\n      toast.error('Session expired \u2014 please log in again.');\r\n    };\r\n    window.addEventListener('auth_error', handleAuthError);\r\n\r\n    return () => {\r\n      window.removeEventListener("popstate", handlePopState);\r\n      window.removeEventListener('auth_error', handleAuthError);\r\n    };\r\n  }, [isAuth]);`;

if (content.includes(OLD)) {
  content = content.replace(OLD, NEW);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: auth_error listener added to SplitBuddy.jsx');
} else {
  console.log('WARN: Could not find target string. Trying alternative...');
  // Try Unix line endings
  const OLD_UNIX = `    return () => window.removeEventListener("popstate", handlePopState);\n  }, [isAuth]);`;
  const NEW_UNIX = `    const handleAuthError = () => {\n      useAuthStore.getState().logout();\n      toast.error('Session expired \u2014 please log in again.');\n    };\n    window.addEventListener('auth_error', handleAuthError);\n\n    return () => {\n      window.removeEventListener("popstate", handlePopState);\n      window.removeEventListener('auth_error', handleAuthError);\n    };\n  }, [isAuth]);`;
  
  if (content.includes(OLD_UNIX)) {
    content = content.replace(OLD_UNIX, NEW_UNIX);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS (unix): auth_error listener added to SplitBuddy.jsx');
  } else {
    console.log('ERROR: Could not find target in file. Current content around line 4610:');
    const lines = content.split('\n');
    lines.slice(4608, 4615).forEach((l, i) => console.log(`${4609+i}: ${JSON.stringify(l)}`));
  }
}
