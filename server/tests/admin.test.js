// REQUIRES MongoDB (mongodb-memory-server). Not runnable in the restricted sandbox — see CLAUDE.md.
const request = require('supertest');
const app = require('../src/app');
const Slot = require('../src/models/Slot');
const Parcel = require('../src/models/Parcel');
const Booking = require('../src/models/Booking');
const { toDateKey, addDays, istToDate } = require('../src/utils/dates');
const { startDb, stopDb, clearDb, makeUsers } = require('./helpers');

let ctx;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await clearDb(); ctx = await makeUsers(); });

const put = (templates, h = ctx.h.admin) => request(app).put('/api/admin/slot-templates').set(h).send({ templates });

describe('admin analytics', () => {
  test('admin gets the dashboard payload; everyone else is refused', async () => {
    await Parcel.create({ flatId: ctx.flat.id, courier: 'Amazon', receivedBy: ctx.guard.id });
    const res = await request(app).get('/api/admin/analytics?range=7').set(ctx.h.admin);
    expect(res.status).toBe(200);
    expect(res.body.data.parcelsPerDay).toHaveLength(7);
    expect(res.body.data.kpis.uncollected).toBe(1);
    expect(res.body.data.uncollected[0].flat).toBe('A-1204');
    for (const h of [ctx.h.resident, ctx.h.guard]) expect((await request(app).get('/api/admin/analytics').set(h)).status).toBe(403);
    expect((await request(app).get('/api/admin/analytics?range=90').set(ctx.h.admin)).status).toBe(400);
  });
});

describe('slot windows', () => {
  test('saving windows generates 7 days of slots; editing capacity propagates; booked slots survive', async () => {
    expect((await put([{ startTime: '09:00', endTime: '10:00', capacity: 3 }, { startTime: '23:00', endTime: '23:30', capacity: 3 }])).status).toBe(200);
    expect(await Slot.countDocuments()).toBe(14);

    // a booking on the 23:00 window of a future day
    const target = await Slot.findOne({ startsAt: { $gt: new Date(Date.now() + 36 * 3600 * 1000) } }).sort({ startsAt: 1 });
    await Slot.updateOne({ _id: target._id }, { booked: 1 });

    // new plan: only 10:00-11:00 with capacity 5. Unbooked 09:00 slots go; the booked slot must stay.
    expect((await put([{ startTime: '10:00', endTime: '11:00', capacity: 5 }])).status).toBe(200);
    expect(await Slot.findById(target._id)).not.toBeNull();
    expect(await Slot.countDocuments({ startsAt: { $gt: new Date() }, booked: 0, capacity: 5 })).toBeGreaterThanOrEqual(6);
    expect(await Slot.countDocuments({ dateKey: toDateKey(), capacity: 3, booked: 0, startsAt: { $gt: new Date() } })).toBe(0);
  });

  test('overlapping windows are rejected', async () => {
    const res = await put([{ startTime: '09:00', endTime: '10:30', capacity: 3 }, { startTime: '10:00', endTime: '11:00', capacity: 3 }]);
    expect(res.status).toBe(400);
  });
});

describe('smart suggestion over the API', () => {
  test('a resident who collects at 7 PM is suggested the 7 PM slot', async () => {
    const day = new Date(Date.now() + 48 * 3600 * 1000);
    const key = toDateKey(day);
    const mk = (h) => Slot.create({ dateKey: key, startsAt: new Date(`${key}T${String(h - 5).padStart(2, '0')}:30:00Z`), endsAt: new Date(`${key}T${String(h - 4).padStart(2, '0')}:30:00Z`), capacity: 4 });
    const [nine, seven] = [await mk(9), await mk(19)];
    for (let i = 1; i <= 3; i += 1) {
      const p = await Parcel.create({ flatId: ctx.flat.id, courier: 'Amazon', receivedBy: ctx.guard.id, status: 'DELIVERED' });
      await Booking.create({ parcelId: p.id, slotId: seven.id, residentId: ctx.resident.id, status: 'COMPLETED', otpNonce: 'n', otpExpiresAt: new Date(), otpUsedAt: istToDate(addDays(toDateKey(), -i * 5), '19:10') }); // always collected around 7 PM IST
    }
    const res = await request(app).get(`/api/slots?date=${key}`).set(ctx.h.resident);
    const by = Object.fromEntries(res.body.data.slots.map((s) => [s._id, s]));
    expect(by[seven.id].suggested).toBe(true);
    expect(by[seven.id].suggestedReason).toBe('history');
    expect(by[nine.id].suggested).toBe(false);
  });
});
