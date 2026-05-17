const fs = require('fs');
const content = fs.readFileSync('apps/web/src/app/m/quotes/page.tsx', 'utf8');

// I'll manually create a large block replacement since regex is fragile on XML
