const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // IST calendar day
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 0 },
    // `booked` is only ever changed through atomic $inc in bookingService.
    booked: { type: Number, default: 0, min: 0 },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
slotSchema.index({ dateKey: 1, startsAt: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
