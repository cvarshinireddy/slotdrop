const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/handoverController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const env = require('../config/env');
const s = require('./schemas');

// Extra brake on top of per-booking attempt counters: 30 verifications/min per IP.
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, limit: env.isTest ? 10000 : 30,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Slow down a little, please.' } }),
});

router.post('/verify', authenticate, requireRole('guard'), verifyLimiter, validate({ body: s.handoverBody }), c.verify);

module.exports = router;
