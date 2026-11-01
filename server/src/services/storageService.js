const fs = require('fs');
const path = require('path');

// Storage is behind a tiny interface so local disk can be swapped for Cloudinary/S3 on Render
// (Render's disk is ephemeral). Only `publicUrl` is stored in the database.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const publicUrl = (filename) => `/uploads/${filename}`;

module.exports = { UPLOAD_DIR, publicUrl };
