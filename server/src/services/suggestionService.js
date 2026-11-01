const Booking = require('../models/Booking');
const { istHour } = require('../utils/dates');

const HALF_LIFE_DAYS = 30; // a pickup 30 days ago counts half as much as one today
const NEIGHBOUR_WEIGHT = 0.5; // collecting at 7 PM also makes 6 and 8 PM reasonable
const MAX_SUGGESTED = 2;
const MIN_RELATIVE_SCORE = 0.25; // a slot must score at least 25% of the best one, so stale habits do not earn a badge
const DAY_MS = 24 * 3600 * 1000;

/**
 * Recency-weighted histogram of the hours at which this resident usually collects.
 * Exponential decay (weight = 0.5^(age/halfLife)) lets habits change: moved to a night shift? the model adapts.
 * Pure function: takes dates in, returns { hour: weight } out, so it is unit-testable without a database.
 */
function hourWeights(pickups, now = new Date()) {
  const weights = {};
  for (const at of pickups) {
    const ageDays = Math.max(0, (now - new Date(at)) / DAY_MS);
    const h = istHour(at);
    weights[h] = (weights[h] || 0) + 0.5 ** (ageDays / HALF_LIFE_DAYS);
  }
  return weights;
}

const load = (s) => (s.capacity ? s.booked / s.capacity : 1);

/**
 * Choose up to 2 open slots to badge "Suggested for you".
 *  - history: the open slots whose hour (smoothed with its neighbours) matches the resident's habit
 *  - quiet:   no usable history, so suggest the least-loaded slot (also spreads demand across the day)
 * Ties break toward the less-loaded slot, then the earlier one.
 */
function pickSuggested(slots, weights) {
  const open = slots.filter((s) => !s.reason);
  const w = (h) => weights[h] || 0;
  const scored = open
    .map((s) => {
      const h = istHour(s.startsAt);
      return { s, score: w(h) + NEIGHBOUR_WEIGHT * (w(h - 1) + w(h + 1)) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || load(a.s) - load(b.s) || a.s.startsAt - b.s.startsAt);

  if (scored.length) {
    const strong = scored.filter((x) => x.score >= scored[0].score * MIN_RELATIVE_SCORE);
    return { ids: new Set(strong.slice(0, MAX_SUGGESTED).map((x) => String(x.s._id))), reason: 'history' };
  }

  const quiet = [...open].sort((a, b) => load(a) - load(b) || a.startsAt - b.startsAt);
  return { ids: new Set(quiet.slice(0, 1).map((s) => String(s._id))), reason: quiet.length ? 'quiet' : null };
}

async function pickupTimesFor(residentId) {
  const done = await Booking.find({ residentId, status: 'COMPLETED', otpUsedAt: { $ne: null } })
    .sort({ otpUsedAt: -1 }).limit(60).select('otpUsedAt').lean();
  return done.map((b) => b.otpUsedAt);
}

// Adds `suggested` + `suggestedReason` to already-decorated slots (see slotService.listForDate).
async function annotate(slots, resident, now = new Date()) {
  const { ids, reason } = pickSuggested(slots, hourWeights(await pickupTimesFor(resident._id), now));
  return slots.map((s) => ({ ...s, suggested: ids.has(String(s._id)), suggestedReason: ids.has(String(s._id)) ? reason : null }));
}

module.exports = { hourWeights, pickSuggested, annotate, HALF_LIFE_DAYS };
