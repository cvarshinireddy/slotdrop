// REQUIRES MongoDB (mongodb-memory-server). Not runnable in the restricted sandbox — see CLAUDE.md.
const request = require('supertest');
const app = require('../src/app');
const Slot = require('../src/models/Slot');
const Parcel = require('../src/models/Parcel');
const Booking = require('../src/models/Booking');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const { runReminders } = require('../src/jobs/reminderJob');
const { startDb, stopDb, clearDb, makeUsers } = require('./helpers');

let ctx;
const hours = (h) => new Date(Date.now() + h * 3600 * 1000);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await clearDb(); ctx = await makeUsers(); });

async function booked() {
  const parcel = await Parcel.create({ flatId: ctx.flat.id, courier: 'Flipkart', receivedBy: ctx.guard.id });
  const slot = await Slot.create({ dateKey: '2099-01-01', startsAt: hours(24), endsAt: hours(25), capacity: 5 });
  const res = await request(app).post('/api/bookings').set(ctx.h.resident).send({ parcelId: parcel.id, slotId: slot.id });
  expect(res.status).toBe(201);
  const view = await request(app).get(`/api/bookings/${res.body.data.booking._id}`).set(ctx.h.resident);
  return { parcel, slot, booking: view.body.data.booking };
}
const verify = (body, h = ctx.h.guard) => request(app).post('/api/handover/verify').set(h).send(body);

describe('OTP exposure', () => {
  test('owner sees OTP + QR; guard/admin cannot read the booking or any OTP', async () => {
    const { booking, parcel } = await booked();
    expect(booking.otp).toMatch(/^\d{6}$/);
    expect(booking.qrDataUrl).toMatch(/^data:image/);
    expect(booking.otpNonce).toBeUndefined();
    expect((await request(app).get(`/api/bookings/${booking._id}`).set(ctx.h.guard)).status).toBe(403);
    expect((await request(app).get(`/api/bookings/${booking._id}`).set(ctx.h.admin)).status).toBe(403);
    const today = await request(app).get('/api/slots/today').set(ctx.h.guard);
    expect(JSON.stringify(today.body)).not.toContain(booking.otp);
    expect(JSON.stringify(today.body)).not.toMatch(/otpNonce/);
    const timeline = await request(app).get(`/api/parcels/${parcel.id}/timeline`).set(ctx.h.guard);
    expect(JSON.stringify(timeline.body)).not.toContain(booking.otp);
  });
});

describe('handover', () => {
  test('correct OTP delivers the parcel; the same OTP cannot be used twice', async () => {
    const { booking, parcel } = await booked();
    const ok = await verify({ flat: 'A-1204', otp: booking.otp });
    expect(ok.status).toBe(200);
    expect(JSON.stringify(ok.body)).not.toContain(booking.otp);
    expect((await Parcel.findById(parcel.id)).status).toBe('DELIVERED');
    const again = await verify({ flat: 'A-1204', otp: booking.otp });
    expect(again.status).toBe(400); // booking no longer ACTIVE, so no match
  });

  test('QR token works once; concurrent scans: exactly one wins', async () => {
    const { booking } = await booked();
    const raw = await Booking.findById(booking._id).select('+otpNonce');
    const token = require('../src/services/otpService').signQrToken(raw);
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => verify({ qrToken: token })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.body.error?.code === 'OTP_USED')).toHaveLength(4);
  });

  test('wrong OTP is rejected, audited, and locks after 5 attempts (even the right OTP then)', async () => {
    const { booking } = await booked();
    const wrong = booking.otp === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) expect((await verify({ flat: 'A-1204', otp: wrong })).status).toBe(400);
    expect(await AuditLog.countDocuments({ action: 'VERIFY_FAILED' })).toBe(5);
    const locked = await verify({ flat: 'A-1204', otp: booking.otp });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('OTP_LOCKED');
  });

  test('expired OTP/QR is rejected', async () => {
    const { booking } = await booked();
    await Booking.updateOne({ _id: booking._id }, { otpExpiresAt: hours(-1) });
    expect((await verify({ flat: 'A-1204', otp: booking.otp })).status).toBe(410);
  });

  test('only guards can verify', async () => {
    const { booking } = await booked();
    for (const h of [ctx.h.resident, ctx.h.admin]) {
      expect((await verify({ flat: 'A-1204', otp: booking.otp }, h)).status).toBe(403);
    }
  });

  test('delegate code delivers once, to the named person, and is audited', async () => {
    const { booking, parcel } = await booked();
    const d = await request(app).post(`/api/bookings/${booking._id}/delegate`).set(ctx.h.resident)
      .send({ delegateName: 'Meera Iyer' });
    expect(d.status).toBe(201);
    const res = await verify({ flat: 'A-1204', delegateCode: d.body.data.code });
    expect(res.status).toBe(200);
    expect(res.body.data.deliveredTo).toBe('Meera Iyer');
    const actions = (await AuditLog.find({ parcelId: parcel._id }).sort({ at: 1 })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['SLOT_BOOKED', 'DELEGATED', 'DELIVERED']));
    expect((await verify({ flat: 'A-1204', delegateCode: d.body.data.code })).status).toBe(400);
  });
});

describe('reminders', () => {
  test('50h-old unbooked parcel gets one reminder; not repeated within 24h', async () => {
    const old = await Parcel.create({
      flatId: ctx.flat.id, courier: 'Amazon', receivedBy: ctx.guard.id, receivedAt: hours(-50),
    });
    await Parcel.create({ flatId: ctx.flat.id, courier: 'Amazon', receivedBy: ctx.guard.id, receivedAt: hours(-5) });
    expect(await runReminders()).toBe(1);
    expect(await runReminders()).toBe(0);
    const n = await Notification.find({ userId: ctx.resident.id, type: 'reminder' });
    expect(n).toHaveLength(1);
    expect(String(n[0].parcelId)).toBe(old.id);
  });
});
