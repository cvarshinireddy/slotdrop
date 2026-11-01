const request = require('supertest');
const app = require('../src/app');
const { startDb, stopDb, clearDb, makeUsers } = require('./helpers');

let ctx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await clearDb(); ctx = await makeUsers(); });

describe('authentication', () => {
  test('login succeeds with email and phone, never returns the password hash', async () => {
    const byEmail = await request(app).post('/api/auth/login').send({ identifier: 'resident1@test.in', password: 'Passw0rd!' });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.data.token).toBeTruthy();
    expect(JSON.stringify(byEmail.body)).not.toMatch(/passwordHash/);

    const byPhone = await request(app).post('/api/auth/login').send({ identifier: '9800000001', password: 'Passw0rd!' });
    expect(byPhone.status).toBe(200);
  });

  test('wrong password and unknown user give the same 401', async () => {
    const a = await request(app).post('/api/auth/login').send({ identifier: 'resident1@test.in', password: 'nope' });
    const b = await request(app).post('/api/auth/login').send({ identifier: 'ghost@test.in', password: 'nope' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.code).toBe(b.body.error.code);
  });

  test('protected routes reject missing and tampered tokens', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(bad.status).toBe(401);
  });

  test('deactivated users lose access immediately', async () => {
    await ctx.resident.updateOne({ isActive: false });
    expect((await request(app).get('/api/auth/me').set(ctx.h.resident)).status).toBe(401);
  });
});

describe('role-based access', () => {
  test('only admin can list users', async () => {
    expect((await request(app).get('/api/users').set(ctx.h.admin)).status).toBe(200);
    expect((await request(app).get('/api/users').set(ctx.h.guard)).status).toBe(403);
    expect((await request(app).get('/api/users').set(ctx.h.resident)).status).toBe(403);
  });

  test('flat search is for guard/admin only', async () => {
    const guard = await request(app).get('/api/flats/search?q=A-12').set(ctx.h.guard);
    expect(guard.status).toBe(200);
    expect(guard.body.data.flats[0].number).toBe('A-1204');
    expect((await request(app).get('/api/flats/search?q=A').set(ctx.h.resident)).status).toBe(403);
  });

  test('regex characters in flat search do not break or match everything', async () => {
    const res = await request(app).get('/api/flats/search?q=.*').set(ctx.h.guard);
    expect(res.status).toBe(200);
    expect(res.body.data.flats).toHaveLength(0);
  });

  test('only admin can register users; input is validated', async () => {
    const body = { name: 'New Guard', email: 'g@test.in', phone: '9811111111', password: 'Passw0rd!', role: 'guard' };
    expect((await request(app).post('/api/auth/register').set(ctx.h.resident).send(body)).status).toBe(403);
    const ok = await request(app).post('/api/auth/register').set(ctx.h.admin).send(body);
    expect(ok.status).toBe(201);
    expect(ok.body.data.user.passwordHash).toBeUndefined();

    const bad = await request(app).post('/api/auth/register').set(ctx.h.admin)
      .send({ ...body, email: 'x', phone: '123', password: 'short', role: 'resident' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('passwords are stored hashed with bcrypt', async () => {
    const User = require('../src/models/User');
    const u = await User.findOne({ email: 'resident1@test.in' }).select('+passwordHash');
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(u.passwordHash).not.toContain('Passw0rd');
  });
});

describe('input hardening', () => {
  test('operator injection in the users filter is rejected (400), not passed to MongoDB', async () => {
    const res = await request(app).get('/api/users?role[$ne]=admin').set(ctx.h.admin);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect((await request(app).get('/api/users?role=guard').set(ctx.h.admin)).status).toBe(200);
  });

  test('login with operator objects is rejected before any query runs', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
  });
});
