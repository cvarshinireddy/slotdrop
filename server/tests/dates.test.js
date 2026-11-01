const { istToDate, toDateKey, addDays } = require('../src/utils/dates');
const { unavailableReason } = require('../src/services/slotService');

describe('IST date helpers', () => {
  test('9 AM IST is 03:30 UTC', () => {
    expect(istToDate('2026-11-02', '09:00').toISOString()).toBe('2026-11-02T03:30:00.000Z');
  });
  test('late-evening UTC is already the next day in IST', () => {
    expect(toDateKey(new Date('2026-11-01T20:00:00Z'))).toBe('2026-11-02');
  });
  test('addDays crosses month boundaries', () => {
    expect(addDays('2026-11-29', 3)).toBe('2026-12-02');
  });
});

describe('unavailableReason', () => {
  const now = new Date('2026-11-01T00:00:00Z');
  const base = { startsAt: new Date('2026-11-02T00:00:00Z'), capacity: 2, booked: 0, isClosed: false };
  test('open slot has no reason', () => expect(unavailableReason(base, now)).toBeNull());
  test('full slot', () => expect(unavailableReason({ ...base, booked: 2 }, now)).toBe('Fully booked'));
  test('closed slot', () => expect(unavailableReason({ ...base, isClosed: true }, now)).toMatch(/Closed/));
  test('started slot', () => expect(unavailableReason({ ...base, startsAt: new Date('2026-10-31T00:00:00Z') }, now)).toMatch(/started/));
});
