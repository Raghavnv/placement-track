// Creates or updates the placement officer account from ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD.
// Safe to run in production: it never deletes data. Usage: npm run seed:admin
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');

async function upsertAdmin({ email, password, name = 'Placement Officer' }) {
  const passwordHash = await User.hashPassword(password);
  return User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { name, role: 'admin', passwordHash } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD');
  if (env.isProduction && (password === 'change-me' || password.length < 10)) {
    throw new Error('Use a strong ADMIN_SEED_PASSWORD (10+ characters) in production');
  }

  await connectDB(env.mongoUri);
  const admin = await upsertAdmin({ email, password });
  console.log(`Admin ready: ${admin.email}`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { upsertAdmin };
