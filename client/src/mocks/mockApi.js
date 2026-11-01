// In-browser stand-in for the Express API. It mirrors the server contract (shapes, error codes, capacity and
// OTP rules) so screens can be built and demoed with no backend. State lives in localStorage and is synced
// across tabs via BroadcastChannel, so "guard logs parcel in one tab, resident sees it in another" works.
import QRCode from 'qrcode';
import { ApiError } from '../lib/realApi';
import { addDaysKey, dateKey } from '../lib/format';

const KEY = 'slotdrop-mock-db-v1';
const MAX_ATTEMPTS = 5;
const IST = 5.5 * 3600 * 1000;
const H = 3600 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latency = () => sleep(180 + Math.random() * 220);
const uid = () => Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);

import { DEMO_PASSWORD } from '../lib/demo';

// ---- event bus (same API shape as the socket client) -------------------------------------------
const listeners = new Map();
export function subscribe(name, cb) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(cb);
  return () => listeners.get(name).delete(cb);
}
const emitLocal = (name, payload) => listeners.get(name)?.forEach((cb) => cb(payload));
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('slotdrop-mock') : null;
let db;

function emit(name, payload) { emitLocal(name, payload); channel?.postMessage({ name, payload }); }
channel && (channel.onmessage = ({ data }) => { db = load(); emitLocal(data.name, data.payload); });

// ---- seed ---------------------------------------------------------------------------------------
const istToIso = (key, hour) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, hour) - IST).toISOString(); };

function seed() {
  const today = dateKey();
  const flats = ['A-1204', 'A-1101', 'B-0904', 'B-0302', 'C-0701', 'C-1502', 'D-0405'].map((number, i) => ({ _id: `f${i}`, number, tower: number[0] }));
  const flat = (n) => flats.find((f) => f.number === n);
  const mk = (id, name, email, phone, role, flatNo) => ({ _id: id, name, email, phone, role, isActive: true, flatId: flatNo ? flat(flatNo) : undefined });
  const users = [
    mk('u1', 'Priya Sharma', 'priya.sharma@slotdrop.in', '9820011201', 'resident', 'A-1204'),
    mk('u2', 'Rohan Mehta', 'rohan.mehta@slotdrop.in', '9820011202', 'resident', 'A-1101'),
    mk('u3', 'Meera Iyer', 'meera.iyer@slotdrop.in', '9820011203', 'resident', 'B-0904'),
    mk('g1', 'Ramesh Kumar', 'guard1@slotdrop.in', '9820011301', 'guard'),
    mk('a1', 'Anita Deshmukh', 'admin@slotdrop.in', '9820011401', 'admin'),
  ];

  const slots = [];
  for (let d = 0; d < 7; d += 1) {
    const key = addDaysKey(today, d);
    for (let h = 9; h < 21; h += 1) {
      const peak = h >= 18;
      const capacity = peak ? 6 : 4;
      // deterministic pseudo-random fill so the demo always has a mix of open and full slots
      const fill = (d * 7 + h * 3) % 11;
      const booked = fill > 8 ? capacity : Math.min(capacity - 1, fill % 4);
      slots.push({ _id: `s${d}-${h}`, dateKey: key, startsAt: istToIso(key, h), endsAt: istToIso(key, h + 1), capacity, booked, isClosed: false });
    }
  }

  const now = Date.now();
  const P = (id, flatNo, courier, shelfId, hoursAgo, status = 'RECEIVED', extra = {}) => ({
    _id: id, flatId: flat(flatNo), courier, shelfId, status, receivedAt: new Date(now - hoursAgo * H).toISOString(), ...extra,
  });
  const parcels = [
    P('p1', 'A-1204', 'Amazon', 'S-12', 2),
    P('p2', 'A-1204', 'Flipkart', 'S-04', 20),
    P('p3', 'A-1204', 'Myntra', 'S-07', 75),
    P('p4', 'A-1204', 'Blinkit', 'S-01', 120, 'DELIVERED', { deliveredAt: new Date(now - 96 * H).toISOString() }),
    P('p5', 'A-1204', 'Delhivery', 'S-09', 200, 'DELIVERED', { deliveredAt: new Date(now - 170 * H).toISOString() }),
    P('p6', 'A-1101', 'Swiggy Instamart', 'S-02', 3),
    P('p7', 'B-0904', 'Zomato', 'S-03', 1),
    P('p8', 'C-0701', 'BlueDart', 'S-11', 30),
  ];

  // two bookings in later slots today so the guard schedule is not empty
  const hourNow = Math.floor(((now + IST) % (24 * H)) / H);
  const bookings = [];
  [['p6', 'u2', 2], ['p7', 'u3', 3]].forEach(([pid, uidv, off], i) => {
    const slot = slots.find((s) => s.dateKey === today && s.startsAt === istToIso(today, Math.min(20, Math.max(9, hourNow + off))));
    if (!slot) return;
    const parcel = parcels.find((p) => p._id === pid);
    parcel.status = 'SLOT_BOOKED'; parcel.bookingId = `b${i}`;
    slot.booked = Math.min(slot.capacity, slot.booked + 1);
    bookings.push({ _id: `b${i}`, parcelId: pid, slotId: slot._id, residentId: uidv, status: 'ACTIVE', otp: String(100000 + ((i + 1) * 271828) % 900000), otpAttempts: 0, otpExpiresAt: new Date(new Date(slot.endsAt).getTime() + 2 * H).toISOString(), bookedAt: new Date(now - H).toISOString() });
  });

  const notifications = [
    { _id: 'n1', userId: 'u1', type: 'parcel_received', title: 'Your Amazon parcel is at the gate', body: 'When should we hand it over? Pick a slot that suits you.', parcelId: 'p1', createdAt: new Date(now - 2 * H).toISOString() },
    { _id: 'n2', userId: 'u1', type: 'reminder', title: 'Your Myntra parcel is still waiting', body: 'It has been at the gate for over 2 days. Pick a slot so we can hand it over.', parcelId: 'p3', createdAt: new Date(now - 5 * H).toISOString() },
  ];
  const timelines = {
    p4: [['RECEIVED', 120], ['SLOT_BOOKED', 110], ['DELIVERED', 96]].map(([action, h]) => ({ action, at: new Date(now - h * H).toISOString() })),
    p5: [['RECEIVED', 200], ['SLOT_BOOKED', 190], ['DELIVERED', 170]].map(([action, h]) => ({ action, at: new Date(now - h * H).toISOString() })),
  };
  return { v: 1, day: today, users, flats, slots, parcels, bookings, delegations: [], notifications, timelines };
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.day === dateKey()) return raw; // regenerate daily so "today" always has future slots
  } catch { /* corrupt: reseed */ }
  const fresh = seed();
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
db = load();

// ---- helpers ------------------------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const err = (status, code, message) => new ApiError(status, code, message);
const currentUser = () => {
  const id = sessionStorage.getItem('slotdrop-token')?.replace('mock-', '');
  const u = db.users.find((x) => x._id === id);
  if (!u) throw err(401, 'UNAUTHORIZED', 'Please sign in again.');
  return u;
};
const need = (...roles) => { const u = currentUser(); if (!roles.includes(u.role)) throw err(403, 'FORBIDDEN', 'You do not have access to this.'); return u; };
const withVirtuals = (p) => ({ ...p, isOverdue: p.status === 'RECEIVED' && Date.now() - new Date(p.receivedAt) > 48 * H });
const reason = (s) => (s.isClosed ? 'Closed by society office' : new Date(s.startsAt) <= new Date() ? 'Slot has already started' : s.booked >= s.capacity ? 'Fully booked' : null);
const log = (parcelId, action, actor, meta) => { (db.timelines[parcelId] ||= []).push({ action, at: new Date().toISOString(), actorRole: actor?.role || 'system', meta }); };
const notify = (userId, n) => { const x = { _id: uid(), userId, createdAt: new Date().toISOString(), ...n }; db.notifications.unshift(x); emit('notification:new', x); };
const residentsOf = (flatId) => db.users.filter((u) => u.role === 'resident' && u.flatId?._id === flatId);
const slotOf = (id) => db.slots.find((s) => s._id === id);
const parcelOf = (id) => db.parcels.find((p) => p._id === id);

// ---- API ----------------------------------------------------------------------------------------
export const mockApi = {
  async login(identifier, password) {
    await latency();
    const u = db.users.find((x) => x.email === identifier.toLowerCase() || x.phone === identifier);
    if (!u || password !== DEMO_PASSWORD) throw err(401, 'INVALID_CREDENTIALS', 'Email/phone or password is incorrect.');
    return { token: `mock-${u._id}`, user: clone(u) };
  },
  async me() { await latency(); return { user: clone(currentUser()) }; },

  async listParcels(status) {
    await latency();
    const u = currentUser();
    let list = db.parcels.filter((p) => u.role !== 'resident' || p.flatId._id === u.flatId._id);
    if (status) list = list.filter((p) => p.status === status);
    return clone(list.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)).map(withVirtuals));
  },
  async parcelTimeline(id) {
    await latency();
    const p = parcelOf(id);
    const u = currentUser();
    if (!p || (u.role === 'resident' && p.flatId._id !== u.flatId._id)) throw err(404, 'NOT_FOUND', 'Parcel not found.');
    return clone(db.timelines[id] || [{ action: 'RECEIVED', at: p.receivedAt }]);
  },
  async createParcel({ flatId, courier, shelfId, photo }) {
    await latency();
    const guard = need('guard');
    const flat = db.flats.find((f) => f._id === flatId);
    if (!flat) throw err(400, 'UNKNOWN_FLAT', 'That flat does not exist.');
    const parcel = { _id: `p${uid()}`, flatId: flat, courier, shelfId, status: 'RECEIVED', receivedAt: new Date().toISOString(), photoUrl: photo ? URL.createObjectURL(photo) : undefined };
    db.parcels.unshift(parcel);
    log(parcel._id, 'RECEIVED', guard, { courier });
    residentsOf(flatId).forEach((r) => notify(r._id, { type: 'parcel_received', title: `Your ${courier} parcel is at the gate`, body: 'When should we hand it over? Pick a slot that suits you.', parcelId: parcel._id }));
    save();
    emit('parcel:new', { parcelId: parcel._id, flatId, status: 'RECEIVED' });
    return clone(withVirtuals(parcel));
  },
  async searchFlats(q) {
    await sleep(60);
    need('guard', 'admin');
    return clone(db.flats.filter((f) => f.number.toLowerCase().startsWith(q.trim().toLowerCase())).slice(0, 8));
  },

  async listSlots(date) {
    await latency();
    currentUser();
    const slots = db.slots.filter((s) => s.dateKey === (date || dateKey())).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    // "suggested": the mock pretends this resident usually collects around 6-8 PM
    return clone(slots.map((s) => ({ ...s, remaining: Math.max(0, s.capacity - s.booked), reason: reason(s), suggested: !reason(s) && [18, 19].includes(Number(new Date(new Date(s.startsAt).getTime() + IST).getUTCHours())) })));
  },
  async todaySchedule() {
    await latency();
    need('guard', 'admin');
    const slots = db.slots.filter((s) => s.dateKey === dateKey()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return clone(slots.map((s) => ({
      ...s, remaining: Math.max(0, s.capacity - s.booked), reason: reason(s),
      bookings: db.bookings.filter((b) => b.slotId === s._id && b.status === 'ACTIVE').map((b) => ({ _id: b._id, status: b.status, parcelId: withVirtuals(parcelOf(b.parcelId)) })),
    })));
  },

  async createBooking(parcelId, slotId) {
    await latency();
    const u = need('resident');
    const parcel = parcelOf(parcelId);
    if (!parcel) throw err(404, 'NOT_FOUND', 'Parcel not found.');
    if (parcel.flatId._id !== u.flatId._id) throw err(403, 'FORBIDDEN', 'This parcel is not for your flat.');
    if (parcel.status !== 'RECEIVED') throw err(409, 'PARCEL_NOT_BOOKABLE', 'This parcel already has a slot or was delivered.');
    db = load(); // pick up seats taken in other tabs before checking capacity
    const slot = slotOf(slotId);
    if (!slot) throw err(404, 'NOT_FOUND', 'Slot not found.');
    if (reason(slot)) throw err(409, 'SLOT_FULL', 'Sorry, that slot just filled up. Please pick another.');
    slot.booked += 1;
    parcel.status = 'SLOT_BOOKED';
    const booking = { _id: `b${uid()}`, parcelId, slotId, residentId: u._id, status: 'ACTIVE', otp: String(Math.floor(100000 + Math.random() * 900000)), otpAttempts: 0, otpExpiresAt: new Date(new Date(slot.endsAt).getTime() + 2 * H).toISOString(), bookedAt: new Date().toISOString() };
    parcel.bookingId = booking._id;
    db.bookings.push(booking);
    log(parcelId, 'SLOT_BOOKED', u, { slotId });
    save();
    emit('slot:updated', { slotId, remaining: slot.capacity - slot.booked });
    emit('parcel:updated', { parcelId, flatId: parcel.flatId._id, status: 'SLOT_BOOKED' });
    return { booking: clone(booking), slot: clone(slot), parcel: clone(parcel) };
  },
  async listBookings() {
    await latency();
    const u = need('resident');
    return clone(db.bookings.filter((b) => b.residentId === u._id).map((b) => ({ ...b, otp: undefined, slotId: slotOf(b.slotId) })));
  },
  async getBooking(id) {
    await latency();
    const u = need('resident');
    const b = db.bookings.find((x) => x._id === id && x.residentId === u._id);
    if (!b) throw err(404, 'NOT_FOUND', 'Booking not found.');
    const out = { ...clone(b), slotId: clone(slotOf(b.slotId)), parcelId: clone(withVirtuals(parcelOf(b.parcelId))) };
    delete out.otp;
    if (b.status === 'ACTIVE') {
      out.otp = b.otp;
      out.qrDataUrl = await QRCode.toDataURL(`mock-qr:${b._id}`, { margin: 1, width: 320 });
      out.delegations = db.delegations.filter((d) => d.bookingId === id && !d.usedAt && new Date(d.expiresAt) > new Date()).map(clone);
    }
    return out;
  },
  async cancelBooking(id) {
    await latency();
    const u = need('resident');
    const b = db.bookings.find((x) => x._id === id && x.residentId === u._id && x.status === 'ACTIVE');
    if (!b) throw err(404, 'NOT_FOUND', 'No active booking found.');
    b.status = 'CANCELLED';
    const slot = slotOf(b.slotId); slot.booked = Math.max(0, slot.booked - 1);
    const p = parcelOf(b.parcelId); p.status = 'RECEIVED'; delete p.bookingId;
    log(p._id, 'SLOT_CANCELLED', u);
    save();
    emit('slot:updated', { slotId: slot._id });
    emit('parcel:updated', { parcelId: p._id, flatId: p.flatId._id, status: 'RECEIVED' });
    return { booking: clone(b) };
  },
  async delegate(id, { delegateName, delegatePhone }) {
    await latency();
    const u = need('resident');
    const b = db.bookings.find((x) => x._id === id && x.residentId === u._id && x.status === 'ACTIVE');
    if (!b) throw err(404, 'NOT_FOUND', 'No active booking found.');
    if (db.delegations.filter((d) => d.bookingId === id && !d.usedAt).length >= 3) throw err(409, 'DELEGATION_LIMIT', 'You already shared this pickup 3 times.');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    const d = { _id: uid(), bookingId: id, delegateName, delegatePhone, code, expiresAt: new Date(Math.min(new Date(b.otpExpiresAt), Date.now() + 24 * H)).toISOString() };
    db.delegations.push(d);
    log(b.parcelId, 'DELEGATED', u, { delegateName });
    save();
    return { delegation: clone(d), code };
  },

  async verifyHandover({ qrToken, flat, otp, delegateCode }) {
    await latency();
    const guard = need('guard');
    db = load();
    const bad = () => err(400, 'OTP_INVALID', 'That code does not match. Please check and try again.');
    let booking; let delegation;
    if (qrToken) {
      booking = db.bookings.find((b) => `mock-qr:${b._id}` === qrToken);
      if (!booking) throw bad();
      if (booking.status === 'COMPLETED') throw err(409, 'OTP_USED', 'This code was already used. The parcel has been handed over.');
    } else {
      const f = db.flats.find((x) => x.number === flat.toUpperCase());
      const live = db.bookings.filter((b) => b.status === 'ACTIVE' && parcelOf(b.parcelId)?.flatId._id === f?._id);
      if (live.length && live.every((b) => b.otpAttempts >= MAX_ATTEMPTS)) throw err(429, 'OTP_LOCKED', 'Too many wrong attempts. Ask the resident to cancel and rebook.');
      const open = live.filter((b) => b.otpAttempts < MAX_ATTEMPTS);
      if (otp) booking = open.find((b) => b.otp === otp);
      else {
        delegation = db.delegations.find((d) => !d.usedAt && new Date(d.expiresAt) > new Date() && d.code === delegateCode.toUpperCase() && open.some((b) => b._id === d.bookingId));
        booking = delegation && open.find((b) => b._id === delegation.bookingId);
      }
      if (!booking) { open.forEach((b) => { b.otpAttempts += 1; }); log(`flat:${flat}`, 'VERIFY_FAILED', guard); save(); throw bad(); }
    }
    if (new Date(booking.otpExpiresAt) <= new Date()) throw err(410, 'OTP_EXPIRED', 'This code has expired.');
    booking.status = 'COMPLETED'; booking.otpUsedAt = new Date().toISOString();
    if (delegation) delegation.usedAt = booking.otpUsedAt;
    const parcel = parcelOf(booking.parcelId);
    parcel.status = 'DELIVERED'; parcel.deliveredAt = booking.otpUsedAt;
    log(parcel._id, 'DELIVERED', guard, { deliveredTo: delegation ? `delegate:${delegation.delegateName}` : 'resident' });
    residentsOf(parcel.flatId._id).forEach((r) => notify(r._id, { type: 'delivered', title: `${parcel.courier} parcel handed over`, body: delegation ? `Collected by ${delegation.delegateName}.` : 'Collected. Thanks for using SlotDrop.', parcelId: parcel._id }));
    save();
    emit('parcel:updated', { parcelId: parcel._id, flatId: parcel.flatId._id, status: 'DELIVERED' });
    return { parcel: clone(withVirtuals(parcel)), deliveredTo: delegation ? delegation.delegateName : 'resident', via: qrToken ? 'qr' : delegation ? 'delegate' : 'otp' };
  },

  async listNotifications() {
    await latency();
    const u = currentUser();
    const list = db.notifications.filter((n) => n.userId === u._id);
    return { notifications: clone(list), unread: list.filter((n) => !n.readAt).length };
  },
  async readNotification(id) { const n = db.notifications.find((x) => x._id === id); if (n) { n.readAt = new Date().toISOString(); save(); } return { notification: clone(n) }; },
  async readAllNotifications() { const u = currentUser(); db.notifications.filter((n) => n.userId === u._id).forEach((n) => { n.readAt ||= new Date().toISOString(); }); save(); return { ok: true }; },
};

// Dev helper for demos: window.__slotdropMock.reset()
if (typeof window !== 'undefined') window.__slotdropMock = { reset: () => { localStorage.removeItem(KEY); location.reload(); } };
