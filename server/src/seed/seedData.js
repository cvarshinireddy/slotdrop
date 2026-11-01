// Pure builder for demo data: no database access, deterministic for a given `now`.
// Keeping it pure means the tricky part (are the relationships consistent?) is unit-tested without MongoDB.
const crypto = require('crypto');
const mongoose = require('mongoose');
const { istToDate, toDateKey, addDays, istHour } = require('../utils/dates');
const { DEFAULT_WINDOWS } = require('../services/slotService');

const { ObjectId } = mongoose.Types;
const HOUR = 3600 * 1000;
const OTP_GRACE_MS = 2 * HOUR; // must match bookingService
const DEMO_PASSWORD = 'SlotDrop@123';

// [name, email, phone, flat]
const RESIDENTS = [
  ['Priya Sharma', 'priya.sharma@slotdrop.in', '9820011201', 'A-1204'],
  ['Rohan Mehta', 'rohan.mehta@slotdrop.in', '9820011202', 'A-1101'],
  ['Ananya Reddy', 'ananya.reddy@slotdrop.in', '9820011203', 'A-0802'],
  ['Meera Iyer', 'meera.iyer@slotdrop.in', '9820011204', 'B-0904'],
  ['Arjun Nair', 'arjun.nair@slotdrop.in', '9820011205', 'B-0302'],
  ['Kavya Menon', 'kavya.menon@slotdrop.in', '9820011206', 'B-1203'],
  ['Vikram Singh', 'vikram.singh@slotdrop.in', '9820011207', 'C-0701'],
  ['Sneha Kulkarni', 'sneha.kulkarni@slotdrop.in', '9820011208', 'C-1502'],
  ['Aditya Joshi', 'aditya.joshi@slotdrop.in', '9820011209', 'D-0405'],
  ['Pooja Bansal', 'pooja.bansal@slotdrop.in', '9820011210', 'D-1008'],
];
const EXTRA_FLATS = ['A-0604', 'B-0501', 'C-0903', 'D-1201']; // vacant: gives the guard's flat autocomplete more to match

// Parcels still at the gate: [resident, courier, shelf, hoursAgo]
const RECEIVED = [
  ['Priya Sharma', 'Amazon', 'S-12', 2], ['Priya Sharma', 'Flipkart', 'S-04', 20], ['Priya Sharma', 'Myntra', 'S-07', 75],
  ['Rohan Mehta', 'Swiggy Instamart', 'S-02', 3], ['Meera Iyer', 'Blinkit', 'S-03', 1], ['Arjun Nair', 'BlueDart', 'S-11', 52],
  ['Vikram Singh', 'Delhivery', 'S-09', 30], ['Sneha Kulkarni', 'Zomato', 'S-06', 1],
];
// Booked, waiting for pickup: [resident, courier, shelf, daysFromToday | 'soon', hour]
const BOOKED = [
  ['Priya Sharma', 'Amazon', 'S-01', 1, 19], ['Ananya Reddy', 'Flipkart', 'S-05', 1, 10], ['Kavya Menon', 'Myntra', 'S-08', 1, 18],
  ['Aditya Joshi', 'Amazon', 'S-10', 1, 18], ['Pooja Bansal', 'Delhivery', 'S-02', 2, 12], ['Rohan Mehta', 'Blinkit', 'S-06', 'soon', 0],
];
// Already collected, evening-heavy like a real working society: [resident, courier, shelf, daysAgo, pickupHour]
const DELIVERED = [
  ['Priya Sharma', 'Blinkit', 'S-03', 2, 19], ['Priya Sharma', 'Amazon', 'S-09', 5, 19], ['Priya Sharma', 'Flipkart', 'S-11', 8, 20], ['Priya Sharma', 'Myntra', 'S-04', 10, 18],
  ['Rohan Mehta', 'Delhivery', 'S-07', 3, 9], ['Rohan Mehta', 'Zomato', 'S-01', 6, 10],
  ['Meera Iyer', 'Amazon', 'S-12', 1, 18], ['Meera Iyer', 'Flipkart', 'S-05', 7, 19],
  ['Arjun Nair', 'Amazon', 'S-02', 2, 20], ['Arjun Nair', 'BlueDart', 'S-08', 9, 20],
  ['Vikram Singh', 'Myntra', 'S-10', 4, 12], ['Sneha Kulkarni', 'Amazon', 'S-06', 3, 19], ['Sneha Kulkarni', 'Flipkart', 'S-03', 8, 18],
  ['Aditya Joshi', 'Swiggy Instamart', 'S-12', 5, 18], ['Pooja Bansal', 'Amazon', 'S-05', 6, 9], ['Ananya Reddy', 'Myntra', 'S-01', 4, 19],
];

function buildSeedData({ now = new Date(), passwordHash }) {
  const today = toDateKey(now);
  const id = () => new ObjectId();
  const at = (dateKey, hour, minute = 0) => new Date(istToDate(dateKey, `${String(hour).padStart(2, '0')}:00`).getTime() + minute * 60000);
  const ago = (hours) => new Date(now.getTime() - hours * HOUR);

  // ---- flats & users
  const flats = [...RESIDENTS.map((r) => r[3]), ...EXTRA_FLATS].sort().map((number) => ({ _id: id(), tower: number[0], number, floor: Number(number.slice(2, 4)) }));
  const flatByNo = Object.fromEntries(flats.map((f) => [f.number, f]));
  const mkUser = (name, email, phone, role, flatNo) => ({ _id: id(), name, email, phone, role, passwordHash, isActive: true, ...(flatNo ? { flatId: flatByNo[flatNo]._id } : {}) });
  const admin = mkUser('Anita Deshmukh', 'admin@slotdrop.in', '9820011401', 'admin');
  const guards = [mkUser('Ramesh Kumar', 'guard1@slotdrop.in', '9820011301', 'guard'), mkUser('Suresh Yadav', 'guard2@slotdrop.in', '9820011302', 'guard')];
  const residents = RESIDENTS.map(([n, e, p, f]) => mkUser(n, e, p, 'resident', f));
  const users = [admin, ...guards, ...residents];
  const resident = (name) => residents.find((r) => r.name === name);
  const flatOf = (u) => flats.find((f) => String(f._id) === String(u.flatId));

  // ---- slot windows & a rolling calendar: 10 days of history (for analytics) + 7 days ahead of today (plus today, so a week of upcoming slots holds even late at night)
  const templates = DEFAULT_WINDOWS.map((w) => ({ _id: id(), ...w, isActive: true }));
  const slots = [];
  const slotAt = {};
  for (let d = -10; d <= 7; d += 1) {
    const dateKey = addDays(today, d);
    for (const t of templates) {
      const startsAt = istToDate(dateKey, t.startTime);
      // tomorrow 6-7 PM is deliberately tiny (2 seats) so the demo has a genuinely full slot
      const capacity = d === 1 && t.startTime === '18:00' ? 2 : t.capacity;
      const slot = { _id: id(), dateKey, startsAt, endsAt: istToDate(dateKey, t.endTime), capacity, booked: 0, isClosed: false };
      slots.push(slot);
      slotAt[`${dateKey}|${istHour(startsAt)}`] = slot;
    }
  }
  const findSlot = (dayOffset, hour) => slotAt[`${addDays(today, dayOffset)}|${hour}`];

  const parcels = []; const bookings = []; const delegations = []; const auditLogs = []; const notifications = [];
  const guardFor = (i) => guards[i % guards.length];
  const audit = (parcel, action, actor, when, meta, entity = ['Parcel', parcel._id]) =>
    auditLogs.push({ _id: id(), entityType: entity[0], entityId: entity[1], parcelId: parcel._id, action, actorId: actor?._id, actorRole: actor?.role || 'system', meta, at: when });
  const note = (user, type, title, body, parcel, when, read) =>
    notifications.push({ _id: id(), userId: user._id, type, title, body, parcelId: parcel._id, createdAt: when, ...(read ? { readAt: new Date(when.getTime() + 20 * 60000) } : {}) });
  const newParcel = (r, courier, shelfId, receivedAt, i, extra = {}) => {
    const p = { _id: id(), flatId: r.flatId, courier, shelfId, status: 'RECEIVED', receivedBy: guardFor(i)._id, receivedAt, ...extra };
    parcels.push(p);
    audit(p, 'RECEIVED', guardFor(i), receivedAt, { courier, shelfId });
    return p;
  };
  const newBooking = (p, r, slot, bookedAt, status, extra = {}) => {
    const b = {
      _id: id(), parcelId: p._id, slotId: slot._id, residentId: r._id, status, bookedAt,
      otpNonce: crypto.randomBytes(16).toString('hex'), otpExpiresAt: new Date(slot.endsAt.getTime() + OTP_GRACE_MS), otpAttempts: 0, ...extra,
    };
    bookings.push(b); slot.booked += 1;
    audit(p, 'SLOT_BOOKED', r, bookedAt, { slotId: slot._id, startsAt: slot.startsAt }, ['Booking', b._id]);
    return b;
  };

  // at the gate
  RECEIVED.forEach(([name, courier, shelf, h], i) => {
    const r = resident(name);
    const overdue = h > 48;
    const p = newParcel(r, courier, shelf, ago(h), i, overdue ? { lastReminderAt: ago(h - 48 + 1) } : {});
    note(r, 'parcel_received', `Your ${courier} parcel is at the gate`, 'When should we hand it over? Pick a slot that suits you.', p, ago(h), h > 24);
    if (overdue) {
      note(r, 'reminder', `Your ${courier} parcel is still waiting`, 'It has been at the gate for over 2 days. Pick a slot so we can hand it over.', p, ago(h - 48 + 1), false);
      audit(p, 'REMINDER_SENT', null, ago(h - 48 + 1));
    }
  });

  // next bookable slot later today, so the guard's Today view is never empty; after 8 PM it falls back to tomorrow 9 AM
  const soonSlot = () => {
    for (let h = istHour(now) + 1; h <= 20; h += 1) { const s = findSlot(0, h); if (s && s.startsAt > now) return s; }
    return findSlot(1, 9);
  };

  // booked and waiting
  BOOKED.forEach(([name, courier, shelf, dayOffset, hour], i) => {
    const r = resident(name);
    const slot = dayOffset === 'soon' ? soonSlot() : findSlot(dayOffset, hour);
    const receivedAt = ago(6 + i * 3);
    const p = newParcel(r, courier, shelf, receivedAt, i);
    const b = newBooking(p, r, slot, ago(4 + i), 'ACTIVE');
    p.status = 'SLOT_BOOKED'; p.bookingId = b._id;
    note(r, 'parcel_received', `Your ${courier} parcel is at the gate`, 'When should we hand it over? Pick a slot that suits you.', p, receivedAt, true);
    if (name === 'Priya Sharma') {
      // one neighbour pickup already shared, so the demo can show the delegate flow at the gate
      delegations.push({ _id: id(), bookingId: b._id, createdBy: r._id, delegateName: 'Meera Iyer', delegatePhone: '9820011204', codeNonce: crypto.randomBytes(16).toString('hex'), expiresAt: new Date(Math.min(b.otpExpiresAt.getTime(), now.getTime() + 24 * HOUR)) });
      audit(p, 'DELEGATED', r, ago(1), { delegateName: 'Meera Iyer' }, ['Booking', b._id]);
    }
  });

  // history
  DELIVERED.forEach(([name, courier, shelf, daysAgo, hour], i) => {
    const r = resident(name);
    const slot = findSlot(-daysAgo, hour);
    const pickedUp = new Date(slot.startsAt.getTime() + 12 * 60000);
    const receivedAt = new Date(pickedUp.getTime() - (20 + (i % 5) * 6) * HOUR);
    const p = newParcel(r, courier, shelf, receivedAt, i, { status: 'DELIVERED', deliveredAt: pickedUp });
    const b = newBooking(p, r, slot, new Date(receivedAt.getTime() + 1.5 * HOUR), 'COMPLETED', { otpUsedAt: pickedUp });
    p.bookingId = b._id;
    audit(p, 'DELIVERED', guardFor(i), pickedUp, { via: 'otp', deliveredTo: 'resident' });
    note(r, 'delivered', `${courier} parcel handed over`, 'Collected. Thanks for using SlotDrop.', p, pickedUp, true);
  });

  return {
    templates, flats, users, slots, parcels, bookings, delegations, auditLogs, notifications,
    demo: [
      { role: 'Resident', identifier: 'priya.sharma@slotdrop.in' }, { role: 'Guard', identifier: 'guard1@slotdrop.in' }, { role: 'Admin', identifier: 'admin@slotdrop.in' },
    ],
    password: DEMO_PASSWORD,
  };
}

module.exports = { buildSeedData, DEMO_PASSWORD };
