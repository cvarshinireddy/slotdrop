const User = require('../models/User');
const Flat = require('../models/Flat');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.listUsers = asyncHandler(async (req, res) => {
  const filter = req.query.role ? { role: req.query.role } : {};
  const users = await User.find(filter).populate('flatId').sort({ name: 1 });
  res.json({ data: { users } });
});

exports.setActive = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot deactivate your own account.');
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) throw ApiError.notFound('User not found.');
  res.json({ data: { user } });
});

exports.listFlats = asyncHandler(async (_req, res) => {
  res.json({ data: { flats: await Flat.find().sort({ number: 1 }) } });
});

exports.createFlat = asyncHandler(async (req, res) => {
  const flat = await Flat.create(req.body);
  res.status(201).json({ data: { flat } });
});

// Escapes regex metacharacters so user input cannot become a regex (ReDoS / injection).
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.searchFlats = asyncHandler(async (req, res) => {
  const q = escapeRegex(String(req.query.q || '').trim());
  const flats = await Flat.find(q ? { number: new RegExp(`^${q}`, 'i') } : {}).sort({ number: 1 }).limit(8);
  res.json({ data: { flats } });
});
