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
    suggested: false, // filled by suggestionService in Step 7
  }));
}

module.exports = { generateSlots, unavailableReason, listForDate };
