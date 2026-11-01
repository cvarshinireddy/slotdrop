const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // parcel_received | slot_booked | reminder | delivered ...
    title: { type: String, required: true },
    body: { type: String, required: true },
    parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
