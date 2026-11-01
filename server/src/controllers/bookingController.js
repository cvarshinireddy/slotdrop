const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const delegationService = require('../services/delegationService');
const bookingService = require('../services/bookingService');

exports.create = asyncHandler(async (req, res) => {
  const { booking, slot, parcel } = await bookingService.createBooking({ ...req.body, resident: req.user });
  res.status(201).json({ data: { booking, slot, parcel } });
});

exports.listMine = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ residentId: req.user._id }).populate('slotId').sort({ bookedAt: -1 });
  res.json({ data: { bookings } });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ data: { booking: await bookingService.ownerView(req.params.id, req.user) } }); // owner-only: OTP + QR
});

exports.delegate = asyncHandler(async (req, res) => {
  const { delegation, code } = await delegationService.createDelegation({
    bookingId: req.params.id, resident: req.user, ...req.body,
  });
  res.status(201).json({ data: { delegation: { _id: delegation._id, delegateName: delegation.delegateName, expiresAt: delegation.expiresAt }, code } });
});

exports.cancel = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking({ bookingId: req.params.id, resident: req.user });
  res.json({ data: { booking } });
});
