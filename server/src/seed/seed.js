// Usage: npm run seed            (refuses to run when NODE_ENV=production)
//        npm run seed -- --force (wipes and reseeds even in production: only for a demo database!)
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB } = require('../config/db');
const { buildSeedData, DEMO_PASSWORD } = require('./seedData');

const MODELS = {
  templates: 'SlotTemplate', flats: 'Flat', users: 'User', slots: 'Slot', parcels: 'Parcel',
  bookings: 'Booking', delegations: 'Delegation', auditLogs: 'AuditLog', notifications: 'Notification',
};

async function main() {
  if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to wipe a production database. Re-run with --force if this is a demo database.');
  }
  await connectDB();
  Object.values(MODELS).forEach((m) => require(`../models/${m}`)); // register every model

  // Native deleteMany: AuditLog deliberately blocks Mongoose-level deletes (it is append-only at the API level).
  await Promise.all(Object.values(MODELS).map((m) => mongoose.model(m).collection.deleteMany({})));

  const data = buildSeedData({ passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) });
  for (const [key, model] of Object.entries(MODELS)) {
    await mongoose.model(model).insertMany(data[key], { ordered: true });
  }

  const by = (r) => data.users.filter((u) => u.role === r).length;
  const ahead = data.slots.filter((s) => s.startsAt > new Date()).length;
  console.log(`Seeded: ${by('admin')} admin, ${by('guard')} guards, ${by('resident')} residents, ${data.flats.length} flats, ${data.parcels.length} parcels, ${data.bookings.length} bookings, ${data.slots.length} slots (${ahead} upcoming).`);
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
  data.demo.forEach((d) => console.log(`  ${d.role.padEnd(9)} ${d.identifier}`));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
