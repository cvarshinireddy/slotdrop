const crypto = require('crypto');
const Booking = require('../models/Booking');
const Delegation = require('../models/Delegation');
const ApiError = require('../utils/ApiError');
const auditService = require('./auditService');
const otpService = require('./otpService');
const { BOOKING_STATUS } = require('../utils/constants');

const MAX_ACTIVE_DELEGATIONS = 3;

// Lets a resident authorise a neighbour/family member to collect. The temporary code is shown ONCE
// here (and again to the owner on their booking screen); it dies at the earlier of `hours` or the OTP expiry.
async function createDelegation({ bookingId, resident, delegateName, delegatePhone, hours = 24 }) {
  const booking = await Booking.findOne({ _id: bookingId, residentId: resident._id, status: BOOKING_STATUS.ACTIVE });
  if (!booking) throw ApiError.notFound('No active booking found.');

  const active = await Delegation.countDocuments({ bookingId, usedAt: null, expiresAt: { $gt: new Date() } });
  if (active >= MAX_ACTIVE_DELEGATIONS) throw ApiError.conflict('You already shared this pickup 3 times.', 'DELEGATION_LIMIT');

  const expiresAt = new Date(Math.min(booking.otpExpiresAt.getTime(), Date.now() + hours * 3600 * 1000));
  const delegation = new Delegation({
    bookingId, createdBy: resident._id, delegateName, delegatePhone, expiresAt,
    codeNonce: crypto.randomBytes(16).toString('hex'),
  });
  await delegation.save();

  await auditService.log({
    entityType: 'Booking', entityId: booking._id, parcelId: booking.parcelId, action: 'DELEGATED', actor: resident,
    meta: { delegateName },
  });
  return { delegation, code: otpService.deriveDelegateCode(delegation.id, delegation.codeNonce) };
}

module.exports = { createDelegation };
