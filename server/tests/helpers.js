const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Flat = require('../src/models/Flat');
const authService = require('../src/services/authService');

let mongod;

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build indexes before tests
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

// Creates one user per role and returns ready-to-use Bearer headers.
async function makeUsers() {
  const flat = await Flat.create({ tower: 'A', number: 'A-1204', floor: 12 });
  const mk = (role, i, extra = {}) =>
    authService.createUser({
      name: `${role} ${i}`, email: `${role}${i}@test.in`, phone: `98000000${String(i).padStart(2, '0')}`,
      password: 'Passw0rd!', role, ...extra,
    });
  const resident = await mk('resident', 1, { flatId: flat.id });
  const guard = await mk('guard', 2);
  const admin = await mk('admin', 3);
  const auth = (u) => ({ Authorization: `Bearer ${authService.signToken(u)}` });
  return { flat, resident, guard, admin, h: { resident: auth(resident), guard: auth(guard), admin: auth(admin) } };
}

module.exports = { startDb, stopDb, clearDb, makeUsers };
