const asyncHandler = require('../utils/asyncHandler');
const parcelService = require('../services/parcelService');
const auditService = require('../services/auditService');

exports.create = asyncHandler(async (req, res) => {
  const parcel = await parcelService.logParcel({ ...req.body, file: req.file, guard: req.user });
  res.status(201).json({ data: { parcel } });
});

exports.list = asyncHandler(async (req, res) => {
  const parcels = await parcelService.listFor(req.user, req.query);
  res.json({ data: { parcels } });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ data: { parcel: await parcelService.getFor(req.user, req.params.id) } });
});

exports.timeline = asyncHandler(async (req, res) => {
  const parcel = await parcelService.getFor(req.user, req.params.id); // enforces ownership
  res.json({ data: { timeline: await auditService.timelineForParcel(parcel._id) } });
});
