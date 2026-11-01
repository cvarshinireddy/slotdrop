const Parcel = require('../models/Parcel');
const Flat = require('../models/Flat');
const ApiError = require('../utils/ApiError');
const auditService = require('./auditService');
const { publicUrl } = require('./storageService');
const { ROLES } = require('../utils/constants');

async function logParcel({ flatId, courier, shelfId, file, guard }) {
  if (!(await Flat.exists({ _id: flatId }))) throw ApiError.badRequest('That flat does not exist.', 'UNKNOWN_FLAT');
  const parcel = await Parcel.create({
    flatId, courier, shelfId,
    photoUrl: file ? publicUrl(file.filename) : undefined,
    receivedBy: guard._id,
  });
  await auditService.log({
    entityType: 'Parcel', entityId: parcel._id, parcelId: parcel._id, action: 'RECEIVED', actor: guard,
    meta: { courier, shelfId },
  });
  return parcel.populate('flatId');
}

// Residents are scoped to their own flat in the QUERY itself, not filtered afterwards.
function listFor(user, { status, limit = 50 } = {}) {
  const filter = {};
  if (user.role === ROLES.RESIDENT) filter.flatId = user.flatId;
  if (status) filter.status = status;
  return Parcel.find(filter).populate('flatId').sort({ receivedAt: -1 }).limit(limit);
}

async function getFor(user, id) {
  const parcel = await Parcel.findById(id).populate('flatId');
  if (!parcel) throw ApiError.notFound('Parcel not found.');
  if (user.role === ROLES.RESIDENT && String(parcel.flatId._id) !== String(user.flatId)) {
    throw ApiError.notFound('Parcel not found.'); // 404, not 403: do not reveal that the id exists
  }
  return parcel;
}

module.exports = { logParcel, listFor, getFor };
