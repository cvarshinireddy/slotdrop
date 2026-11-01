const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body.identifier, req.body.password);
  res.json({ data: { token, user } });
});

exports.me = asyncHandler(async (req, res) => {
  await req.user.populate('flatId');
  res.json({ data: { user: req.user } });
});

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.body);
  res.status(201).json({ data: { user } });
});
