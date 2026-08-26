/**
 * Standalone MongoDB connection check.
 *
 * Deliberately does not import config/env.js: that file also demands the
 * Firebase service account, and the point here is to prove the Atlas URI works
 * on its own. Testing one thing at a time is the difference between "it
 * doesn't boot" and knowing exactly which credential is wrong.
 *
 *   node src/scripts/checkDb.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('✗ MONGODB_URI is empty in server/.env');
  process.exit(1);
}

// Report the shape of the URI without ever printing the password.
const redacted = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:••••••@');
console.log(`  URI: ${redacted}`);

if (uri.includes('<db_password>') || uri.includes('<password>')) {
  console.error('\n✗ The placeholder is still there. Replace <db_password> with the real password.');
  process.exit(1);
}

const dbName = uri.split('/').pop().split('?')[0];
if (!dbName) {
  console.error(
    '\n✗ No database name in the URI.' +
      '\n  Add /timeless_baazar just before the "?", otherwise Mongo writes' +
      '\n  everything into a database called "test".'
  );
  process.exit(1);
}
console.log(`  Database: ${dbName}`);

try {
  console.log('\n  Connecting...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  const admin = mongoose.connection.db.admin();
  const { version } = await admin.serverInfo();
  const collections = await mongoose.connection.db.listCollections().toArray();

  console.log(`\n✓ Connected. MongoDB ${version}`);
  console.log(`  Collections: ${collections.length ? collections.map((c) => c.name).join(', ') : '(none yet — expected)'}`);

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error(`\n✗ Could not connect: ${error.message}\n`);

  const hint = {
    'bad auth': 'Wrong username or password. Check Atlas → Database Access.',
    'Authentication failed': 'Wrong username or password. Check Atlas → Database Access.',
    ENOTFOUND: 'The hostname is wrong. Re-copy the string from Atlas → Connect → Drivers.',
    'querySrv': 'The hostname is wrong. Re-copy the string from Atlas → Connect → Drivers.',
    'IP that isn': 'Your IP is not allowed. Atlas → Network Access → add 0.0.0.0/0.',
    'timed out': 'Nothing answered. Usually Network Access, or the cluster is still provisioning.',
  };

  const match = Object.entries(hint).find(([key]) => error.message.includes(key));
  if (match) console.error(`  Likely cause: ${match[1]}\n`);

  process.exit(1);
}
