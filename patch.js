const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/m/quotes/page.tsx', 'utf8');

function wrapInput(label, oldStr) {
  return <div>\n  <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T></T></label>\n  \n</div>;
}

// Just load and manually replace specific patterns using regex or strings.
// Or simply override the return statement.
