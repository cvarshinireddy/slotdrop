// REQUIRES MongoDB (mongodb-memory-server). Not runnable in the restricted sandbox — see CLAUDE.md.
const request = require('supertest');
const app = require('../src/app');
const Slot = require('../src/models/Slot');
const Parcel = require('../src/models/Parcel');
const Booking = require('../src/models/Booking');
const authService = require('../src/services/authService');
const { startDb, stopDb, clearDb, makeUsers } = require('./helpers');

let ctx;
const future = (h) => new Date(Date.now() + h * 3600 * 1000);
const mkSlot = (capacity) =>
  Slot.create({ dateKey: '2099-01-01', startsAt: future(24), endsAt: future(25), capacity });

// Creates N residents in the same flat, each with their own RECEIVED parcel.
async function residentsWithParcels(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const user = await authService.createUser({
      name: `R${i}`, email: `r${i}@t.in`, phone: `97000000${String(i).padStart(2, '0')}`,
      password: 'Passw0rd!', role: 'resident', flatId: ctx.flat.id,
    });
    const parcel = await Parcel.create({ flatId: ctx.flat.id, courier: 'Amazon', receivedBy: ctx.guard.id });
    out.push({ user, parcel, headers: { Authorization: `Bearer ${authService.signToken(user)}` } });
  }
  return out;
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await clearDb(); ctx = await makeUsers(); });

describe('atomic slot capacity', () => {
  test('20 concurrent bookings on a capacity-3 slot: exactly 3 succeed', async () => {
    const slot = await mkSlot(3);
    const rs = await residentsWithParcels(20);
    const results = await Promise.all(
      rs.map((r) => request(app).post('/api/bookings').set(r.headers).send({ parcelId: r.parcel.id, slotId: slot.id }))
    );
    const ok = results.filter((r) => r.status === 201);
    const full = results.filter((r) => r.status === 409 && r.body.error.code === 'SLOT_FULL');
    expect(ok).toHaveLength(3);
    expect(full).toHaveLength(17);
    expect((await Slot.findById(slot.id)).booked).toBe(3);
    expect(await Booking.countDocuments({ slotId: slot.id, status: 'ACTIVE' })).toBe(3);
  });

  test('same parcel booked twice concurrently: one booking, seat count stays 1', async () => {
    const slot = await mkSlot(5);
    const [r] = await residentsWithParcels(1);
    const body = { parcelId: r.parcel.id, slotId: slot.id };
    const results = await Promise.all([1, 2, 3, 4].map(() => request(app).post('/api/bookings').set(r.headers).send(body)));
    expect(results.filter((x) => x.status === 201)).toHaveLength(1);
    expect((await Slot.findById(slot.id)).booked).toBe(1);
  });

  test('cancel releases the seat exactly once, even when cancelled concurrently', async () => {
    const slot = await mkSlot(1);
    const [r] = await residentsWithParcels(1);
    const b = await request(app).post('/api/bookings').set(r.headers).send({ parcelId: r.parcel.id, slotId: slot.id });
    const id = b.body.data.booking._id;
    const res = await Promise.all([1, 2, 3].map(() => request(app).delete(`/api/bookings/${id}`).set(r.headers)));
    expect(res.filter((x) => x.status === 200)).toHaveLength(1);
    expect((await Slot.findById(slot.id)).booked).toBe(0);
    expect((await Parcel.findById(r.parcel.id)).status).toBe('RECEIVED');
  });

  test('past, closed and foreign-flat bookings are rejected', async () => {
    const [r] = await residentsWithParcels(1);
    const past = await Slot.create({ dateKey: '2000-01-01', startsAt: future(-5), endsAt: future(-4), capacity: 5 });
    const closed = await Slot.create({ dateKey: '2099-01-02', startsAt: future(48), endsAt: future(49), capacity: 5, isClosed: true });
    for (const s of [past, closed]) {
      const res = await request(app).post('/api/bookings').set(r.headers).send({ parcelId: r.parcel.id, slotId: s.id });
      expect(res.status).toBe(409);
    }
    const other = await Parcel.create({ flatId: require('mongoose').Types.ObjectId.createFromTime(1), courier: 'Amazon', receivedBy: ctx.guard.id });
    const slot = await mkSlot(5);
    const res = await request(app).post('/api/bookings').set(r.headers).send({ parcelId: other.id, slotId: slot.id });
    expect(res.status).toBe(403);
  });

  test('admin cannot lower capacity below seats already booked', async () => {
    const slot = await mkSlot(3);
    const rs = await residentsWithParcels(2);
    await Promise.all(rs.map((r) => request(app).post('/api/bookings').set(r.headers).send({ parcelId: r.parcel.id, slotId: slot.id })));
    const low = await request(app).patch(`/api/slots/${slot.id}`).set(ctx.h.admin).send({ capacity: 1 });
    expect(low.status).toBe(409);
    const ok = await request(app).patch(`/api/slots/${slot.id}`).set(ctx.h.admin).send({ capacity: 2 });
    expect(ok.status).toBe(200);
  });

  test("residents only see their own flat's parcels; guards cannot book", async () => {
    const [r] = await residentsWithParcels(1);
    const list = await request(app).get('/api/parcels').set(r.headers);
    expect(list.body.data.parcels).toHaveLength(1);
    const slot = await mkSlot(1);
    const g = await request(app).post('/api/bookings').set(ctx.h.guard).send({ parcelId: r.parcel.id, slotId: slot.id });
    expect(g.status).toBe(403);
  });
});
