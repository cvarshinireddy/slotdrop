const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10000 : limit, // tests hammer endpoints; production stays strict
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });

// 10 login attempts per 15 min per IP slows credential stuffing / brute force.
const authLimiter = make(15 * 60 * 1000, 10, 'Too many attempts. Please try again in a few minutes.');
const apiLimiter = make(60 * 1000, 300, 'Slow down a little, please.');

module.exports = { authLimiter, apiLimiter };
