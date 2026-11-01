const Slot = require('../models/Slot');
const SlotTemplate = require('../models/SlotTemplate');
const { istToDate, toDateKey, addDays } = require('../utils/dates');

// Creates missing slots for the next `days` days from the active templates.
// Idempotent: the unique {dateKey, startsAt} index + $setOnInsert means re-runs never reset `booked`.
async function generateSlots(days = 7, from = new Date()) {
  const templates = await SlotTemplate.find({ isActive: true });
  const start = toDateKey(from);
  const ops = [];
  for (let i = 0; i < days; i += 1) {
    const dateKey = addDays(start, i);
    for (const t of templates) {
      ops.push({
        updateOne: {
          filter: { dateKey, startsAt: istToDate(dateKey, t.startTime) },
          update: {
            $setOnInsert: {
              endsAt: istToDate(dateKey, t.endTime),
              capacity: t.capacity,
              booked: 0,
              isClosed: false,
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (ops.length) await Slot.bulkWrite(ops, { ordered: false });
  return ops.length;
}

// Why a slot cannot be booked (null = bookable). Shown to residents instead of a bare disabled chip.
function unavailableReason(slot, now = new Date()) {
  if (slot.isClosed) return 'Closed by society office';
  if (slot.startsAt <= now) return 'Slot has already started';
  if (slot.booked >= slot.capacity) return 'Fully booked';
  return null;
}

async function listForDate(dateKey, now = new Date()) {
  const slots = await Slot.find({ dateKey }).sort({ startsAt: 1 }).lean();
  return slots.map((s) => ({
    ...s,
    remaining: Math.max(0, s.capacity - s.booked),
    reason: unavailableReason(s, now),
    suggested: false, // set by suggestionService.annotate for residents
    suggestedReason: null,
  }));
}

/**
 * Make the next `days` days match the current templates after an admin edit:
 *  - capacity/end time follow the template (never below seats already booked)
 *  - future, completely unbooked slots whose window no longer exists are removed
 *  - missing windows are generated
 * Slots with bookings are never deleted, so no resident loses a booked slot to an admin edit.
 */
async function syncToTemplates(days = 7, from = new Date()) {
  const templates = await SlotTemplate.find({ isActive: true });
  const start = toDateKey(from);
  const end = addDays(start, days - 1);
  const valid = [];
  const ops = [];
  for (let i = 0; i < days; i += 1) {
    const dateKey = addDays(start, i);
    for (const t of templates) {
      const startsAt = istToDate(dateKey, t.startTime);
      valid.push(startsAt);
      ops.push({
        updateOne: {
          // one condition object: a duplicate `startsAt` key would silently overwrite the exact-match filter
          filter: { dateKey, startsAt: { $eq: startsAt, $gt: from }, booked: { $lte: t.capacity } },
          update: { $set: { capacity: t.capacity, endsAt: istToDate(dateKey, t.endTime) } },
        },
      });
    }
  }
  if (ops.length) await Slot.bulkWrite(ops, { ordered: false });
  await Slot.deleteMany({ dateKey: { $gte: start, $lte: end }, startsAt: { $gt: from, $nin: valid }, booked: 0 });
  return generateSlots(days, from);
}

const DEFAULT_WINDOWS = Array.from({ length: 12 }, (_, i) => ({
  startTime: `${String(9 + i).padStart(2, '0')}:00`, endTime: `${String(10 + i).padStart(2, '0')}:00`, capacity: 9 + i >= 18 ? 6 : 4,
}));

// First boot on an empty database: 9 AM - 9 PM hourly windows so the app is usable before an admin customises them.
async function ensureDefaultTemplates() {
  if (await SlotTemplate.estimatedDocumentCount()) return false;
  await SlotTemplate.insertMany(DEFAULT_WINDOWS);
  return true;
}

module.exports = { DEFAULT_WINDOWS, ensureDefaultTemplates, generateSlots, syncToTemplates, unavailableReason, listForDate };
