// Central place for configuration so the rest of the code never reads process.env directly.
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slotdrop',
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-jwt-secret' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Separate secret for OTP derivation so a JWT leak does not reveal OTPs.
  otpSecret: process.env.OTP_SECRET || (isTest ? 'test-otp-secret' : ''),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isTest,
};

if (!isTest && (!env.jwtSecret || !env.otpSecret)) {
  throw new Error('JWT_SECRET and OTP_SECRET must be set (see .env.example)');
}

module.exports = env;
