const AuditLog = require('../models/AuditLog');

// Single entry point for audit writes so every status change is recorded the same way.
async function log({ entityType, entityId, parcelId, action, actor, meta }) {
  return AuditLog.create({
    entityType,
    entityId,
    parcelId,
    action,
    actorId: actor?._id,
    actorRole: actor?.role || 'system',
    meta,
  });
}

const timelineForParcel = (parcelId) => AuditLog.find({ parcelId }).sort({ at: 1 }).lean();

module.exports = { log, timelineForParcel };
