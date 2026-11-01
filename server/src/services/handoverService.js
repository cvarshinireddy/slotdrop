const Booking = require('../models/Booking');
const Delegation = require('../models/Delegation');
const Parcel = require('../models/Parcel');
const Flat = require('../models/Flat');
const ApiError = require('../utils/ApiError');
const otpService = require('./otpService');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { PARCEL_STATUS, BOOKING_STATUS } = require('../utils/constants');

const invalid = () => new ApiError(400, 'OTP_INVALID', 'That code does not match. Please check and try again.');

/**
 * Release a parcel to whoever presents a valid proof: QR token, resident OTP (+flat) or delegate code (+flat).
 * Guards type only a flat number + code, so a 6-digit OTP only has to be unique among that flat's
 * live bookings; wrong guesses are counted per booking and lock it after MAX_ATTEMPTS.
 */
async function verify({ guard, qrToken, flat, otp, delegateCode }) {
  let booking = null;
  let delegation = null;
  let via;

  if (qrToken) {
    via = 'qr';
    const bid = otpService.verifyQrToken(qrToken);
    if (bid === 'EXPIRED') throw new ApiError(410, 'OTP_EXPIRED', 'This QR has expired. Ask the resident to rebook.');
    if (!bid) throw invalid();
    booking = await Booking.findById(bid);
    if (!booking) throw invalid();
  } else {
    via = delegateCode ? 'delegate' : 'otp';
    const flatDoc = await Flat.findOne({ number: flat.toUpperCase() });
    const parcels = flatDoc ? await Parcel.find({ flatId: flatDoc._id, status: PARCEL_STATUS.SLOT_BOOKED }).select('_id') : [];
    const candidates = await Booking.find({
      parcelId: { $in: parcels.map((p) => p._id) }, status: BOOKING_STATUS.ACTIVE,
    }).select('+otpNonce');

    if (candidates.length && candidates.every((c) => c.otpAttempts >= otpService.MAX_ATTEMPTS)) {
      throw new ApiError(429, 'OTP_LOCKED', 'Too many wrong attempts. Ask the resident to cancel and rebook.');
    }
    const open = candidates.filter((c) => c.otpAttempts < otpService.MAX_ATTEMPTS);

    if (via === 'otp') {
      booking = open.find((c) => otpService.safeEqual(otpService.deriveOtp(c.id, c.otpNonce), otp)) || null;
    } else {
      const delegations = await Delegation.find({
        bookingId: { $in: open.map((c) => c._id) }, usedAt: null, expiresAt: { $gt: new Date() },
      }).select('+codeNonce');
      delegation = delegations.find((d) =>
        otpService.safeEqual(otpService.deriveDelegateCode(d.id, d.codeNonce), delegateCode.toUpperCase())) || null;
      booking = delegation ? open.find((c) => c.id === String(delegation.bookingId)) : null;
    }

    if (!booking) {
      // Count the miss against every live booking of this flat, then record it for the audit trail.
      await Booking.updateMany({ _id: { $in: open.map((c) => c._id) } }, { $inc: { otpAttempts: 1 } });
      await auditService.log({
        entityType: flatDoc ? 'Flat' : 'User', entityId: flatDoc?._id || guard._id, action: 'VERIFY_FAILED', actor: guard, meta: { flat, via },
      });
      throw invalid();
    }
  }

  // Atomic single-use consume: of any number of simultaneous scans, only one matches this filter.
  const consumed = await Booking.findOneAndUpdate(
    {
      _id: booking._id, status: BOOKING_STATUS.ACTIVE, otpUsedAt: null,
      otpExpiresAt: { $gt: new Date() }, otpAttempts: { $lt: otpService.MAX_ATTEMPTS },
    },
    { otpUsedAt: new Date(), status: BOOKING_STATUS.COMPLETED },
    { new: true }
  );
  if (!consumed) {
    const fresh = await Booking.findById(booking._id);
    if (fresh.otpUsedAt) throw new ApiError(409, 'OTP_USED', 'This code was already used. The parcel has been handed over.');
    if (fresh.otpExpiresAt <= new Date()) throw new ApiError(410, 'OTP_EXPIRED', 'This code has expired.');
    throw new ApiError(409, 'BOOKING_INACTIVE', 'This booking is no longer active.');
  }

  if (delegation) await Delegation.updateOne({ _id: delegation._id }, { usedAt: new Date() });
  const parcel = await Parcel.findByIdAndUpdate(
    consumed.parcelId, { status: PARCEL_STATUS.DELIVERED, deliveredAt: new Date() }, { new: true }
  ).populate('flatId');

  await auditService.log({
    entityType: 'Parcel', entityId: parcel._id, parcelId: parcel._id, action: 'DELIVERED', actor: guard,
    meta: { via, deliveredTo: delegation ? `delegate:${delegation.delegateName}` : 'resident' },
  });
  await notificationService.safely(Promise.all([
    notificationService.notifyFlat(parcel.flatId._id, {
      type: 'delivered',
      title: `${parcel.courier} parcel handed over`,
      body: delegation ? `Collected by ${delegation.delegateName}.` : 'Collected. Thanks for using SlotDrop.',
      parcelId: parcel._id,
    }),
    notificationService.emitParcelEvent('parcel:updated', parcel),
  ]));

  // Deliberately returns no OTP material.
  return { parcel, deliveredTo: delegation ? delegation.delegateName : 'resident', via };
}

module.exports = { verify };
