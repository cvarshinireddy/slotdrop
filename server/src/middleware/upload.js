const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { UPLOAD_DIR } = require('../services/storageService');
const ApiError = require('../utils/ApiError');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Extension comes from the validated MIME type, never from the client's filename.
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT[file.mimetype]}`),
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Photo must be a JPG, PNG or WebP image.', 'BAD_FILE')),
}).single('photo');

module.exports = { uploadPhoto, path };
