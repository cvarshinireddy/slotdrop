const asyncHandler = require('../utils/asyncHandler');
const handoverService = require('../services/handoverService');

exports.verify = asyncHandler(async (req, res) => {
  res.json({ data: await handoverService.verify({ ...req.body, guard: req.user }) });
});
