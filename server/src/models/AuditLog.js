const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../utils/constants');

// Append-only: no update/delete endpoints exist, and the schema blocks accidental updates.
const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ['Parcel', 'Booking', 'Slot'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system/cron
    actorRole: { type: String, enum: ['resident', 'guard', 'admin', 'system'], required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);
auditLogSchema.index({ entityType: 1, entityId: 1, at: 1 });

['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) => {
  auditLogSchema.pre(op, function blocked() {
    throw new Error('AuditLog is append-only');
  });
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
