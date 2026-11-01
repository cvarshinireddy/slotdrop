const cron = require('node-cron');
const Parcel = require('../models/Parcel');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const REMIND_AFTER_MS = 48 * 3600 * 1000;
const REMIND_EVERY_MS = 24 * 3600 * 1000;

// Reminds for parcels still unbooked after 48h, at most once per 24h each.
async function runReminders(now = new Date()) {
  const due = await Parcel.find({
    status: 'RECEIVED',
    receivedAt: { $lte: new Date(now - REMIND_AFTER_MS) },
    $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lte: new Date(now - REMIND_EVERY_MS) } }],
  }).select('_id');

  let sent = 0;
  for (const { _id } of due) {
    // Atomic claim: if two server instances run the job at once, only one wins this parcel (no double reminders).
    const parcel = await Parcel.findOneAndUpdate(
      {
        _id, status: 'RECEIVED',
        $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lte: new Date(now - REMIND_EVERY_MS) } }],
      },
      { lastReminderAt: now },
      { new: true }
    );
    if (!parcel) continue;
    await notificationService.notifyFlat(parcel.flatId, {
      type: 'reminder',
      title: `Your ${parcel.courier} parcel is still waiting`,
      body: 'It has been at the gate for over 2 days. Pick a slot so we can hand it over.',
      parcelId: parcel._id,
    });
    await auditService.log({ entityType: 'Parcel', entityId: parcel._id, parcelId: parcel._id, action: 'REMINDER_SENT' });
    sent += 1;
  }
  return sent;
}

const start = () => cron.schedule('0 * * * *', () => runReminders().catch((e) => console.error('reminder job', e)));

module.exports = { runReminders, start };
