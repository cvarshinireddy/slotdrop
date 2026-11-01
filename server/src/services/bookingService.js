const crypto = require('crypto');
const Slot = require('../models/Slot');
const Parcel = require('../models/Parcel');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const auditService = require('./auditService');
const { PARCEL_STATUS, BOOKING_STATUS } = require('../utils/constants');

const OTP_GRACE_MS = 2 * 60 * 60 * 1000; // OTP stays valid until 2h after the slot ends

/**
 * Book a slot for a parcel without ever overbooking.
 *
 * CONCURRENCY: there is no "read capacity, then write". The check and the increment happen in ONE
 * atomic MongoDB operation: the filter only matches while booked < capacity, so of N simultaneous
 * requests for the last seat exactly one matches; the rest get null and are rejected.
 */
async function createBooking({ parcelId, slotId, resident }) {
  const parcel = await Parcel.findById(parcelId);
  if (!parcel) throw ApiError.notFound('Parcel not found.');
  if (String(parcel.flatId) !== String(resident.flatId)) throw ApiError.forbidden('This parcel is not for your flat.');
  if (parcel.status !== PARCEL_STATUS.RECEIVED) {
    throw ApiError.conflict('This parcel already has a slot or was delivered.', 'PARCEL_NOT_BOOKABLE');
  }

  // 1) Claim a seat atomically.
  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      isClosed: false,
      startsAt: { $gt: new Date() },
      $expr: { $lt: ['$booked', '$capacity'] },
    },
    { $inc: { booked: 1 } },
    { new: true }
  );
  if (!slot) {
    const exists = await Slot.findById(slotId).lean();
    if (!exists) throw ApiError.notFound('Slot not found.');
    throw ApiError.conflict('Sorry, that slot just filled up. Please pick another.', 'SLOT_FULL');
  }

  // 2) Claim the parcel atomically (guards double-booking the same parcel from two devices).
  //    If anything below fails we MUST hand the seat back, otherwise capacity leaks.
  let parcelClaimed = false;
  try {
    const claimed = await Parcel.findOneAndUpdate(
      { _id: parcelId, status: PARCEL_STATUS.RECEIVED },
      { status: PARCEL_STATUS.SLOT_BOOKED },
      { new: true }
    );
    if (!claimed) throw ApiError.conflict('This parcel already has a slot.', 'PARCEL_NOT_BOOKABLE');
    parcelClaimed = true;

    const booking = await Booking.create({
      parcelId,
      slotId: slot._id,
      residentId: resident._id,
      otpNonce: crypto.randomBytes(16).toString('hex'),
      otpExpiresAt: new Date(slot.endsAt.getTime() + OTP_GRACE_MS),
    });
    await Parcel.updateOne({ _id: parcelId }, { bookingId: booking._id });
    await auditService.log({
      entityType: 'Booking', entityId: booking._id, parcelId, action: 'SLOT_BOOKED', actor: resident,
      meta: { slotId: slot._id, startsAt: slot.startsAt },
    });
    return { booking, slot, parcel: claimed };
  } catch (err) {
    await Slot.updateOne({ _id: slot._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } }); // compensate
    // Only undo the parcel if WE claimed it; otherwise we would clobber the winning request's state.
    if (parcelClaimed) {
      await Parcel.updateOne({ _id: parcelId }, { status: PARCEL_STATUS.RECEIVED, $unset: { bookingId: 1 } });
    }
    throw err;
  }
}

/** Cancel an ACTIVE booking: release the seat and put the parcel back to RECEIVED. */
async function cancelBooking({ bookingId, resident }) {
  // The status flip is the atomic gate: only one concurrent cancel can win it, so the seat is released once.
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, residentId: resident._id, status: BOOKING_STATUS.ACTIVE },
    { status: BOOKING_STATUS.CANCELLED },
    { new: true }
  );
  if (!booking) throw ApiError.notFound('No active booking found.');

  await Slot.updateOne({ _id: booking.slotId, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
  await Parcel.updateOne({ _id: booking.parcelId }, { status: PARCEL_STATUS.RECEIVED, $unset: { bookingId: 1 } });
  await auditService.log({
    entityType: 'Booking', entityId: booking._id, parcelId: booking.parcelId, action: 'SLOT_CANCELLED', actor: resident,
  });
  return booking;
}

module.exports = { createBooking, cancelBooking };
