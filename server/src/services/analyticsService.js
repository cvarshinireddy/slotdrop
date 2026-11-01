const Parcel = require('../models/Parcel');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const { toDateKey, addDays, istToDate, istHour } = require('../utils/dates');

const HOUR_MS = 3600 * 1000;
const PEAK_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM .. 9 PM: the society's handover window

const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Pure: turns raw rows into the dashboard payload. All database access lives in `getAnalytics`, so this
 * can be unit tested with plain arrays.
 *   parcels      : { receivedAt, deliveredAt? }   (covering the current AND previous window)
 *   bookingHours : IST start-hour of every non-cancelled booking in the window
 */
function buildAnalytics({ parcels, bookingHours, utilisation, uncollected, now = new Date(), days }) {
  const today = toDateKey(now);
  const firstKey = addDays(today, -(days - 1));
  const start = istToDate(firstKey, '00:00');
  const prevStart = istToDate(addDays(firstKey, -days), '00:00');

  const dayKeys = Array.from({ length: days }, (_, i) => addDays(firstKey, i));
  const perDay = Object.fromEntries(dayKeys.map((k) => [k, { date: k, received: 0, delivered: 0 }]));
  const inCur = (d) => d >= start && d <= now;
  const inPrev = (d) => d >= prevStart && d < start;

  let received = 0; let receivedPrev = 0; let delivered = 0; let deliveredPrev = 0;
  const pickupCur = []; const pickupPrev = [];
  for (const p of parcels) {
    const r = new Date(p.receivedAt);
    if (inCur(r)) { received += 1; perDay[toDateKey(r)].received += 1; } else if (inPrev(r)) receivedPrev += 1;
    if (p.deliveredAt) {
      const d = new Date(p.deliveredAt);
      const hrs = (d - r) / HOUR_MS;
      if (inCur(d)) { delivered += 1; perDay[toDateKey(d)].delivered += 1; pickupCur.push(hrs); } else if (inPrev(d)) { deliveredPrev += 1; pickupPrev.push(hrs); }
    }
  }
  const avg = (a) => (a.length ? round1(a.reduce((x, y) => x + y, 0) / a.length) : null);

  const counts = Object.fromEntries(PEAK_HOURS.map((h) => [h, 0]));
  bookingHours.forEach((h) => { if (h in counts) counts[h] += 1; });
  const peakHours = PEAK_HOURS.map((hour) => ({ hour, label: hourLabel(hour), count: counts[hour] }));

  return {
    range: days,
    kpis: {
      received: { value: received, previous: receivedPrev },
      delivered: { value: delivered, previous: deliveredPrev },
      avgPickupHours: { value: avg(pickupCur), previous: avg(pickupPrev) }, // hours from gate to hand-over
      slotUtilisation: { value: utilisation.capacity ? Math.round((utilisation.booked / utilisation.capacity) * 100) : 0 },
      uncollected: uncollected.count,
      overdue: uncollected.overdue,
    },
    parcelsPerDay: dayKeys.map((k) => perDay[k]),
    peakHours,
    uncollected: uncollected.list,
  };
}

async function getAnalytics(days = 14, now = new Date()) {
  const firstKey = addDays(toDateKey(now), -(days - 1));
  const start = istToDate(firstKey, '00:00');
  const prevStart = istToDate(addDays(firstKey, -days), '00:00');
  const overdueBefore = new Date(now - 48 * HOUR_MS);

  const [parcels, bookings, slots, uncollectedCount, overdueCount, oldest] = await Promise.all([
    // received OR delivered inside the two windows (a parcel received before but delivered inside still counts as a delivery)
    Parcel.find({ $or: [{ receivedAt: { $gte: prevStart } }, { deliveredAt: { $gte: prevStart } }] }).select('receivedAt deliveredAt').lean(),
    Booking.find({ bookedAt: { $gte: start }, status: { $ne: 'CANCELLED' } }).populate('slotId', 'startsAt').lean(),
    Slot.find({ startsAt: { $gt: now, $lte: new Date(+now + 7 * 24 * HOUR_MS) }, isClosed: false }).select('capacity booked').lean(),
    Parcel.countDocuments({ status: { $ne: 'DELIVERED' } }),
    Parcel.countDocuments({ status: 'RECEIVED', receivedAt: { $lt: overdueBefore } }),
    Parcel.find({ status: { $ne: 'DELIVERED' } }).sort({ receivedAt: 1 }).limit(8).populate('flatId', 'number').lean(),
  ]);

  return buildAnalytics({
    parcels,
    bookingHours: bookings.filter((b) => b.slotId).map((b) => istHour(b.slotId.startsAt)),
    utilisation: slots.reduce((a, s) => ({ booked: a.booked + s.booked, capacity: a.capacity + s.capacity }), { booked: 0, capacity: 0 }),
    uncollected: {
      count: uncollectedCount,
      overdue: overdueCount,
      list: oldest.map((p) => ({
        _id: p._id, courier: p.courier, flat: p.flatId?.number, shelfId: p.shelfId, status: p.status, receivedAt: p.receivedAt,
        ageHours: Math.floor((now - p.receivedAt) / HOUR_MS), isOverdue: p.status === 'RECEIVED' && p.receivedAt < overdueBefore,
      })),
    },
    now,
    days,
  });
}

module.exports = { buildAnalytics, getAnalytics, hourLabel };
