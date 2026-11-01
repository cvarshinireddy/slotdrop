// DB-free: suggestion scoring, analytics aggregation, template validation.
const { hourWeights, pickSuggested } = require('../src/services/suggestionService');
const { buildAnalytics } = require('../src/services/analyticsService');
const s = require('../src/routes/schemas');
const { istToDate } = require('../src/utils/dates');

const NOW = new Date('2026-11-10T09:00:00Z'); // 2:30 PM IST on 10 Nov
const at = (key, hhmm) => istToDate(key, hhmm);
const slot = (id, hour, booked = 0, capacity = 4, reason = null) => ({
  _id: id, startsAt: at('2026-11-11', `${String(hour).padStart(2, '0')}:00`), booked, capacity, reason,
});

describe('smart slot suggestion', () => {
  test('habit around 7 PM suggests the 7 PM slot first, neighbours next', () => {
    const pickups = [0, 3, 6, 9, 12].map((d) => new Date(at('2026-11-' + String(10 - d > 0 ? 10 - d : 1).padStart(2, '0'), '19:10')));
    const slots = [slot('a', 9), slot('b', 18), slot('c', 19), slot('d', 20), slot('e', 12)];
    const { ids, reason } = pickSuggested(slots, hourWeights(pickups, NOW));
    expect(reason).toBe('history');
    expect([...ids]).toHaveLength(2);
    expect(ids.has('c')).toBe(true); // 7 PM is the best match
    expect(ids.has('a')).toBe(false);
  });

  test('recent habit outweighs an old one (recency decay)', () => {
    const old = Array.from({ length: 5 }, () => at('2026-06-01', '09:30')); // morning person, 5 months ago
    const recent = Array.from({ length: 3 }, (_, i) => at(`2026-11-0${i + 3}`, '20:15')); // evenings lately
    const { ids } = pickSuggested([slot('m', 9), slot('n', 20)], hourWeights([...old, ...recent], NOW));
    expect(ids.has('n')).toBe(true);
    expect(ids.has('m')).toBe(false);
  });

  test('never suggests a full or closed slot', () => {
    const w = hourWeights([at('2026-11-05', '19:00')], NOW);
    const { ids } = pickSuggested([slot('full', 19, 4, 4, 'Fully booked'), slot('ok', 20)], w);
    expect(ids.has('full')).toBe(false);
    expect(ids.has('ok')).toBe(true);
  });

  test('no history falls back to the single least-loaded slot', () => {
    const { ids, reason } = pickSuggested([slot('busy', 10, 3), slot('quiet', 11, 0), slot('mid', 12, 2)], {});
    expect(reason).toBe('quiet');
    expect([...ids]).toEqual(['quiet']);
  });

  test('nothing open means no suggestion and no reason', () => {
    expect(pickSuggested([slot('x', 9, 4, 4, 'Fully booked')], {})).toEqual({ ids: new Set(), reason: null });
  });
});

describe('analytics aggregation', () => {
  const parcels = [
    { receivedAt: at('2026-11-10', '10:00'), deliveredAt: at('2026-11-10', '13:00') }, // today, 3h to pickup
    { receivedAt: at('2026-11-09', '10:00'), deliveredAt: at('2026-11-10', '10:00') }, // received yesterday, 24h
    { receivedAt: at('2026-11-09', '12:00') }, // still at the gate
    { receivedAt: at('2026-11-02', '12:00'), deliveredAt: at('2026-11-03', '12:00') }, // previous 7-day window
  ];
  const out = buildAnalytics({
    parcels, bookingHours: [18, 18, 19, 9, 3 /* outside the handover window */], now: NOW, days: 7,
    utilisation: { booked: 30, capacity: 120 }, uncollected: { count: 1, overdue: 0, list: [] },
  });

  test('KPIs compare against the previous window', () => {
    expect(out.kpis.received).toEqual({ value: 3, previous: 1 });
    expect(out.kpis.delivered).toEqual({ value: 2, previous: 1 });
    expect(out.kpis.avgPickupHours).toEqual({ value: 13.5, previous: 24 });
    expect(out.kpis.slotUtilisation.value).toBe(25);
  });

  test('per-day series is zero-filled and uses IST days', () => {
    expect(out.parcelsPerDay).toHaveLength(7);
    expect(out.parcelsPerDay.at(-1)).toEqual({ date: '2026-11-10', received: 1, delivered: 2 });
    expect(out.parcelsPerDay.at(-2)).toEqual({ date: '2026-11-09', received: 2, delivered: 0 });
    expect(out.parcelsPerDay[0].received).toBe(0);
  });

  test('peak hours cover 6 AM to 9 PM and ignore out-of-window bookings', () => {
    expect(out.peakHours).toHaveLength(16);
    expect(out.peakHours.find((h) => h.hour === 18)).toEqual({ hour: 18, label: '6 PM', count: 2 });
    expect(out.peakHours.reduce((n, h) => n + h.count, 0)).toBe(4);
  });

  test('no deliveries gives a null average, not NaN', () => {
    const empty = buildAnalytics({ parcels: [], bookingHours: [], now: NOW, days: 7, utilisation: { booked: 0, capacity: 0 }, uncollected: { count: 0, overdue: 0, list: [] } });
    expect(empty.kpis.avgPickupHours.value).toBeNull();
    expect(empty.kpis.slotUtilisation.value).toBe(0);
  });
});

describe('request validation', () => {
  test('overlapping slot windows are rejected, touching ones accepted', () => {
    const ok = { templates: [{ startTime: '09:00', endTime: '10:00', capacity: 4 }, { startTime: '10:00', endTime: '11:00', capacity: 4 }] };
    const bad = { templates: [{ startTime: '09:00', endTime: '10:30', capacity: 4 }, { startTime: '10:00', endTime: '11:00', capacity: 4 }] };
    expect(s.templatesBody.safeParse(ok).success).toBe(true);
    expect(s.templatesBody.safeParse(bad).success).toBe(false);
  });
  test('analytics range accepts only 7, 14, 30 and defaults to 14', () => {
    expect(s.analyticsQuery.parse({}).range).toBe(14);
    expect(s.analyticsQuery.parse({ range: '30' }).range).toBe(30);
    expect(s.analyticsQuery.safeParse({ range: '90' }).success).toBe(false);
  });
});
