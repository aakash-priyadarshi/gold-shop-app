const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/m/quotes/page.tsx', 'utf8');

// Replace Customer Info section
code = code.replace(
  /<div className="grid grid-cols-\[100px_1fr\] gap-2">([\s\S]*?)<div className="relative">([\s\S]*?)<User className=/g,
  function(match, p1, p2) {
      return match;
  }
);
fs.writeFileSync('apps/web/src/app/m/quotes/page.tsx', code);
