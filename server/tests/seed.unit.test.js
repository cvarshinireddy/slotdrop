// DB-free: builds the demo data in memory and checks that every relationship is consistent.
const mongoose = require('mongoose');
const { buildSeedData } = require('../src/seed/seedData');
const User = require('../src/models/User');
const Flat = require('../src/models/Flat');
const Parcel = require('../src/models/Parcel');
const Slot = require('../src/models/Slot');
const SlotTemplate = require('../src/models/SlotTemplate');
const Booking = require('../src/models/Booking');
const Delegation = require('../src/models/Delegation');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');

const MODELS = { templates: SlotTemplate, flats: Flat, users: User, slots: Slot, parcels: Parcel, bookings: Booking, delegations: Delegation, auditLogs: AuditLog, notifications: Notification };
const key = (x) => String(x);

// Run at several clock times: "today's later slot" logic must hold in the morning, evening and late night (IST).
const NOWS = ['2026-11-10T04:00:00Z', '2026-11-10T09:00:00Z', '2026-11-10T16:30:00Z', '2026-11-10T20:30:00Z'];

describe.each(NOWS)('seed data at %s', (iso) => {
  const now = new Date(iso);
  const d = buildSeedData({ now, passwordHash: 'x'.repeat(60) });
  const byId = (list) => new Map(list.map((x) => [key(x._id), x]));
  const slots = byId(d.slots); const parcels = byId(d.parcels); const flats = byId(d.flats);

  test('matches the brief: 1 admin, 2 guards, 10 residents, 30 parcels, a week of upcoming slots', () => {
    const count = (r) => d.users.filter((u) => u.role === r).length;
    expect([count('admin'), count('guard'), count('resident')]).toEqual([1, 2, 10]);
    expect(d.parcels).toHaveLength(30);
    const upcomingDays = new Set(d.slots.filter((s) => s.startsAt > now).map((s) => s.dateKey));
    expect(upcomingDays.size).toBeGreaterThanOrEqual(7);
  });

  test('every document passes its Mongoose schema validation', () => {
    for (const [name, Model] of Object.entries(MODELS)) {
      for (const doc of d[name]) {
        const err = new Model(doc).validateSync();
        expect({ name, id: key(doc._id), err: err && err.message }).toEqual({ name, id: key(doc._id), err: undefined });
      }
    }
  });

  test('emails, phones and flat numbers are unique; residents live in real flats', () => {
    expect(new Set(d.users.map((u) => u.email)).size).toBe(d.users.length);
    expect(new Set(d.users.map((u) => u.phone)).size).toBe(d.users.length);
    expect(new Set(d.flats.map((f) => f.number)).size).toBe(d.flats.length);
    d.users.filter((u) => u.role === 'resident').forEach((u) => expect(flats.has(key(u.flatId))).toBe(true));
    expect(d.flats.some((f) => f.number === 'A-1204')).toBe(true);
  });

  test('slot.booked equals the bookings holding a seat, never exceeds capacity; one slot is full', () => {
    const held = {};
    d.bookings.filter((b) => b.status !== 'CANCELLED').forEach((b) => { held[key(b.slotId)] = (held[key(b.slotId)] || 0) + 1; });
    d.slots.forEach((s) => {
      expect(s.booked).toBe(held[key(s._id)] || 0);
      expect(s.booked).toBeLessThanOrEqual(s.capacity);
    });
    expect(d.slots.some((s) => s.startsAt > now && s.booked === s.capacity)).toBe(true);
  });

  test('parcel status and booking linkage agree', () => {
    const bookingFor = new Map(d.bookings.map((b) => [key(b.parcelId), b]));
    d.parcels.forEach((p) => {
      const b = bookingFor.get(key(p._id));
      if (p.status === 'RECEIVED') expect(b).toBeUndefined();
      if (p.status === 'SLOT_BOOKED') { expect(b.status).toBe('ACTIVE'); expect(key(p.bookingId)).toBe(key(b._id)); expect(slots.get(key(b.slotId)).startsAt > now).toBe(true); }
      if (p.status === 'DELIVERED') { expect(b.status).toBe('COMPLETED'); expect(p.deliveredAt).toEqual(b.otpUsedAt); expect(p.deliveredAt < now).toBe(true); }
    });
    // a booking's resident really lives in the parcel's flat
    d.bookings.forEach((bk) => expect(key(d.users.find((u) => key(u._id) === key(bk.residentId)).flatId)).toBe(key(parcels.get(key(bk.parcelId)).flatId)));
  });

  test('at most one ACTIVE booking per parcel (matches the unique partial index)', () => {
    const active = d.bookings.filter((b) => b.status === 'ACTIVE').map((b) => key(b.parcelId));
    expect(new Set(active).size).toBe(active.length);
  });

  test('demo story is present: overdue parcels, a delegation, a booking today or tomorrow, evening pickup habit', () => {
    expect(d.parcels.filter((p) => p.status === 'RECEIVED' && now - p.receivedAt > 48 * 3600e3).length).toBeGreaterThanOrEqual(2);
    expect(d.delegations).toHaveLength(1);
    expect(d.bookings.some((b) => b.status === 'ACTIVE' && slots.get(key(b.slotId)).startsAt - now < 36 * 3600e3)).toBe(true);
    const priya = d.users.find((u) => u.email === 'priya.sharma@slotdrop.in');
    const evenings = d.bookings.filter((b) => key(b.residentId) === key(priya._id) && b.status === 'COMPLETED').map((b) => (new Date(b.otpUsedAt.getTime() + 5.5 * 3600e3)).getUTCHours());
    expect(evenings.length).toBeGreaterThanOrEqual(4);
    expect(evenings.every((h) => h >= 18)).toBe(true);
  });

  test('audit trail covers every parcel; deliveries and bookings are all logged', () => {
    d.parcels.forEach((p) => expect(d.auditLogs.some((a) => key(a.parcelId) === key(p._id) && a.action === 'RECEIVED')).toBe(true));
    expect(d.auditLogs.filter((a) => a.action === 'DELIVERED')).toHaveLength(d.parcels.filter((p) => p.status === 'DELIVERED').length);
    expect(d.auditLogs.filter((a) => a.action === 'SLOT_BOOKED')).toHaveLength(d.bookings.length);
  });

  test('OTP material is never stored in plaintext', () => {
    d.bookings.forEach((b) => { expect(b.otp).toBeUndefined(); expect(b.otpNonce).toMatch(/^[0-9a-f]{32}$/); });
    expect(JSON.stringify(d.delegations)).not.toMatch(/"code"/);
  });
});

test('seed data is stable for a given clock (same counts every run)', () => {
  const a = buildSeedData({ now: new Date(NOWS[1]), passwordHash: 'x' });
  const b = buildSeedData({ now: new Date(NOWS[1]), passwordHash: 'x' });
  expect(a.slots.map((s) => [s.dateKey, s.booked])).toEqual(b.slots.map((s) => [s.dateKey, s.booked]));
  expect(a.parcels.map((p) => [p.courier, p.status])).toEqual(b.parcels.map((p) => [p.courier, p.status]));
});
