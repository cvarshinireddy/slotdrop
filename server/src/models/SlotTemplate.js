const mongoose = require('mongoose');

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

const slotTemplateSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true, match: hhmm }, // IST, e.g. "09:00"
    endTime: { type: String, required: true, match: hhmm },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slotTemplateSchema.index({ startTime: 1 }, { unique: true });

module.exports = mongoose.model('SlotTemplate', slotTemplateSchema);
