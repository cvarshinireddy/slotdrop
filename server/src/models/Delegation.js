const mongoose = require('mongoose');

const delegationSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delegateName: { type: String, required: true, trim: true, maxlength: 80 },
    delegatePhone: { type: String, trim: true },
    codeNonce: { type: String, required: true, select: false }, // code derived via HMAC, never stored
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delegation', delegationSchema);
