// DB-free checks: these run anywhere, including where no MongoDB binary is available.
const request = require('supertest');
const app = require('../src/app');

describe('app smoke (no database)', () => {
  test('health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  test('unknown route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('protected routes need a token', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).get('/api/flats/search?q=A')).status).toBe(401);
  });

  test('login input is validated before touching the database', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Step 3 routes are protected', async () => {
    for (const [m, url] of [['post', '/api/parcels'], ['get', '/api/parcels'], ['get', '/api/slots'],
      ['get', '/api/slots/today'], ['post', '/api/bookings'], ['put', '/api/admin/slot-templates']]) {
      expect((await request(app)[m](url)).status).toBe(401);
    }
  });
});
