const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const env = require('../config/env');

const MAX_ATTEMPTS = 5;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easy to read out loud at the gate

/**
 * The OTP is never stored. It is derived: HMAC-SHA256(OTP_SECRET, "otp:" + bookingId + ":" + nonce).
 * - The database holds only the random nonce, so a DB leak does not reveal any OTP.
 * - The owning resident can re-open the screen and see the same OTP (derive again on demand).
 * - A fresh nonce per booking means OTPs are unrelated across bookings.
 */
function hmac(label, id, nonce) {
  return crypto.createHmac('sha256', env.otpSecret).update(`${label}:${id}:${nonce}`).digest();
}

function deriveOtp(bookingId, nonce) {
  const n = hmac('otp', bookingId, nonce).readUInt32BE(0) % 1_000_000;
  return String(n).padStart(6, '0');
}

function deriveDelegateCode(delegationId, nonce) {
  const buf = hmac('delegate', delegationId, nonce);
  return Array.from({ length: 6 }, (_, i) => CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]).join('');
}

// Constant-time comparison so response timing cannot leak how many leading characters matched.
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// The QR carries a signed token (not the OTP). It expires with the booking's OTP window.
function signQrToken(booking) {
  const expSec = Math.floor(booking.otpExpiresAt.getTime() / 1000);
  return jwt.sign({ bid: String(booking._id), kind: 'QR', exp: expSec }, env.otpSecret);
}

function verifyQrToken(token) {
  try {
    const p = jwt.verify(token, env.otpSecret);
    return p.kind === 'QR' ? p.bid : null;
  } catch (err) {
    return err.name === 'TokenExpiredError' ? 'EXPIRED' : null;
  }
}

const qrDataUrl = (token) => QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });

module.exports = {
  MAX_ATTEMPTS, deriveOtp, deriveDelegateCode, safeEqual, signQrToken, verifyQrToken, qrDataUrl,
};
