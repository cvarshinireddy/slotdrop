const mongoose = require('mongoose');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Never leak the hash, even if a controller forgets to project it away.
userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; },
});

module.exports = mongoose.model('User', userSchema);
