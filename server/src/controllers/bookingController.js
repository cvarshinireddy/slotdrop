const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
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
  const booking = await Booking.findOne({ _id: req.params.id, residentId: req.user._id }).populate('slotId parcelId');
  if (!booking) throw ApiError.notFound('Booking not found.');
  res.json({ data: { booking } }); // OTP + QR are added in Step 4 (owner-only)
});

exports.cancel = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking({ bookingId: req.params.id, resident: req.user });
  res.json({ data: { booking } });
});
