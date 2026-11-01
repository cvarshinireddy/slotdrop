const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema(
  {
    tower: { type: String, required: true, trim: true, uppercase: true },
    number: { type: String, required: true, unique: true, trim: true, uppercase: true }, // e.g. A-1204
    floor: { type: Number, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Flat', flatSchema);
