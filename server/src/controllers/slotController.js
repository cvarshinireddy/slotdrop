const asyncHandler = require('../utils/asyncHandler');
const Slot = require('../models/Slot');
const SlotTemplate = require('../models/SlotTemplate');
const ApiError = require('../utils/ApiError');
const slotService = require('../services/slotService');
const { toDateKey } = require('../utils/dates');

exports.list = asyncHandler(async (req, res) => {
  const dateKey = req.query.date || toDateKey();
  res.json({ data: { date: dateKey, slots: await slotService.listForDate(dateKey) } });
});

exports.today = asyncHandler(async (_req, res) => {
  const dateKey = toDateKey();
  const Booking = require('../models/Booking');
  const slots = await slotService.listForDate(dateKey);
  const bookings = await Booking.find({ slotId: { $in: slots.map((s) => s._id) }, status: 'ACTIVE' })
    .populate({ path: 'parcelId', populate: { path: 'flatId' } })
    .select('-otpNonce') // guards must never receive OTP material
    .lean();
  const bySlot = bookings.reduce((acc, b) => { (acc[b.slotId] ||= []).push(b); return acc; }, {});
  res.json({ data: { date: dateKey, slots: slots.map((s) => ({ ...s, bookings: bySlot[s._id] || [] })) } });
});

// Admin: change capacity / close a slot. Capacity can never drop below seats already booked.
exports.update = asyncHandler(async (req, res) => {
  const { capacity, isClosed } = req.body;
  const filter = { _id: req.params.id };
  if (capacity !== undefined) filter.booked = { $lte: capacity };
  const slot = await Slot.findOneAndUpdate(filter, { $set: req.body }, { new: true });
  if (!slot) {
    if (await Slot.exists({ _id: req.params.id })) {
      throw ApiError.conflict('Capacity cannot be lower than the seats already booked.', 'CAPACITY_BELOW_BOOKED');
    }
    throw ApiError.notFound('Slot not found.');
  }
  res.json({ data: { slot } });
});

exports.listTemplates = asyncHandler(async (_req, res) => {
  res.json({ data: { templates: await SlotTemplate.find().sort({ startTime: 1 }) } });
});

// Replaces the set of windows, then generates slots for the next 7 days.
exports.replaceTemplates = asyncHandler(async (req, res) => {
  await SlotTemplate.deleteMany({});
  const templates = await SlotTemplate.insertMany(req.body.templates);
  await slotService.generateSlots(7);
  res.json({ data: { templates } });
});
