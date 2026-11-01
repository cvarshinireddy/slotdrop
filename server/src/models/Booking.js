const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
    residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.ACTIVE },
    // The OTP itself is NOT stored: it is HMAC(secret, bookingId + nonce). See otpService.
    otpNonce: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true },
    otpUsedAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Safety net: a parcel can have at most one ACTIVE booking, even if app logic races.
bookingSchema.index(
  { parcelId: 1 },
  { unique: true, partialFilterExpression: { status: BOOKING_STATUS.ACTIVE } }
);

module.exports = mongoose.model('Booking', bookingSchema);
