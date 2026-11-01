// DB-free: every request schema accepts good input and rejects the bad input we care about.
const s = require('../src/routes/schemas');

const ok = (schema, v) => schema.safeParse(v).success;
const OID = '65f0000000000000000000a1';

describe('auth schemas', () => {
  test('login needs string identifier and password (objects cannot smuggle Mongo operators)', () => {
    expect(ok(s.loginBody, { identifier: 'priya.sharma@slotdrop.in', password: 'x' })).toBe(true);
    expect(ok(s.loginBody, { identifier: { $ne: '' }, password: { $ne: '' } })).toBe(false);
    expect(ok(s.loginBody, { identifier: 'ab', password: 'x' })).toBe(false);
  });

  test('register enforces role, Indian mobile, password length and flat for residents', () => {
    const base = { name: 'Neha Kapoor', email: 'NEHA@Example.com', phone: '9876543210', password: 'Passw0rd!', role: 'guard' };
    expect(ok(s.registerBody, base)).toBe(true);
    expect(s.registerBody.parse(base).email).toBe('neha@example.com'); // normalised
    expect(ok(s.registerBody, { ...base, phone: '1234567890' })).toBe(false); // must start 6-9
    expect(ok(s.registerBody, { ...base, phone: '98765' })).toBe(false);
    expect(ok(s.registerBody, { ...base, password: 'short' })).toBe(false);
    expect(ok(s.registerBody, { ...base, role: 'superuser' })).toBe(false);
    expect(ok(s.registerBody, { ...base, role: 'resident' })).toBe(false); // resident without a flat
    expect(ok(s.registerBody, { ...base, role: 'resident', flatId: OID })).toBe(true);
  });

  test('users list filter only accepts known roles', () => {
    expect(ok(s.usersQuery, {})).toBe(true);
    expect(ok(s.usersQuery, { role: 'guard' })).toBe(true);
    expect(ok(s.usersQuery, { role: { $ne: 'admin' } })).toBe(false); // ?role[$ne]=admin
    expect(ok(s.usersQuery, { role: 'owner' })).toBe(false);
  });
});

describe('domain schemas', () => {
  test('flat numbers look like A-1204', () => {
    expect(ok(s.flatBody, { tower: 'A', number: 'A-1204' })).toBe(true);
    expect(ok(s.flatBody, { tower: 'A', number: '1204' })).toBe(false);
    expect(ok(s.flatBody, { tower: 'A', number: 'A-12' })).toBe(false);
  });

  test('parcel log accepts only known couriers', () => {
    expect(ok(s.parcelBody, { flatId: OID, courier: 'Blinkit', shelfId: 'S-04' })).toBe(true);
    expect(ok(s.parcelBody, { flatId: OID, courier: 'FedEx' })).toBe(false);
    expect(ok(s.parcelBody, { flatId: 'not-an-id', courier: 'Amazon' })).toBe(false);
  });

  test('booking and ids must be well-formed ObjectIds', () => {
    expect(ok(s.bookingBody, { parcelId: OID, slotId: OID })).toBe(true);
    expect(ok(s.bookingBody, { parcelId: OID, slotId: { $gt: '' } })).toBe(false);
    expect(ok(s.idParams, { id: 'abc' })).toBe(false);
  });

  test('slot patch needs something to change and sane capacity', () => {
    expect(ok(s.slotPatchBody, {})).toBe(false);
    expect(ok(s.slotPatchBody, { capacity: 6 })).toBe(true);
    expect(ok(s.slotPatchBody, { capacity: -1 })).toBe(false);
    expect(ok(s.slotPatchBody, { capacity: 1000 })).toBe(false);
    expect(ok(s.slotPatchBody, { isClosed: true })).toBe(true);
  });

  test('delegation needs a name; hours are capped at 48', () => {
    expect(ok(s.delegateBody, { delegateName: 'Meera Iyer' })).toBe(true);
    expect(ok(s.delegateBody, { delegateName: 'M' })).toBe(false);
    expect(ok(s.delegateBody, { delegateName: 'Meera', hours: 100 })).toBe(false);
    expect(ok(s.delegateBody, { delegateName: 'Meera', delegatePhone: '12345' })).toBe(false);
  });

  test('slot windows: end after start, capacity 1-100, at most 24', () => {
    const w = (startTime, endTime, capacity = 4) => ({ startTime, endTime, capacity });
    expect(ok(s.templatesBody, { templates: [w('09:00', '10:00')] })).toBe(true);
    expect(ok(s.templatesBody, { templates: [w('10:00', '09:00')] })).toBe(false);
    expect(ok(s.templatesBody, { templates: [w('09:00', '10:00', 0)] })).toBe(false);
    expect(ok(s.templatesBody, { templates: [w('9:00', '10:00')] })).toBe(false);
    expect(ok(s.templatesBody, { templates: [] })).toBe(false);
  });
});
