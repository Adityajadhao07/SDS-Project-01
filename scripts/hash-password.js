const { hashPassword } = require('../api/_lib/auth');
const pw = process.argv[2];
if (!pw) { console.log('Usage: node scripts/hash-password.js "password"'); process.exit(1); }
console.log(hashPassword(pw));
