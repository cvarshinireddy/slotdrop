const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const svc = require('../services/notificationService');

exports.list = asyncHandler(async (req, res) => {
  const notifications = await svc.listFor(req.user._id);
  res.json({ data: { notifications, unread: notifications.filter((n) => !n.readAt).length } });
});

exports.read = asyncHandler(async (req, res) => {
  const n = await svc.markRead(req.user._id, req.params.id);
  if (!n) throw ApiError.notFound('Notification not found.');
  res.json({ data: { notification: n } });
});

exports.readAll = asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user._id);
  res.json({ data: { ok: true } });
});
