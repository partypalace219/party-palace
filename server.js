const { execSync } = require('child_process');
const port = process.env.PORT || 3000;
execSync(`npx serve -s . -l ${port}`, { stdio: 'inherit' });
