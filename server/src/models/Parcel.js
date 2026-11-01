const mongoose = require('mongoose');
const { PARCEL_STATUS, COURIERS } = require('../utils/constants');

const OVERDUE_AFTER_MS = 48 * 60 * 60 * 1000;

const parcelSchema = new mongoose.Schema(
  {
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    courier: { type: String, enum: COURIERS, required: true },
    shelfId: { type: String, trim: true, maxlength: 10 },
    photoUrl: { type: String },
    status: { type: String, enum: Object.values(PARCEL_STATUS), default: PARCEL_STATUS.RECEIVED },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    lastReminderAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

parcelSchema.index({ flatId: 1, status: 1 });
parcelSchema.index({ status: 1, receivedAt: 1 });

// Overdue is derived, not stored, so it can never drift out of sync with the status.
parcelSchema.virtual('isOverdue').get(function isOverdue() {
  return this.status === PARCEL_STATUS.RECEIVED && Date.now() - this.receivedAt.getTime() > OVERDUE_AFTER_MS;
});

module.exports = mongoose.model('Parcel', parcelSchema);
