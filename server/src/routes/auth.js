const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const s = require('./schemas');

router.post('/login', authLimiter, validate({ body: s.loginBody }), c.login);
router.get('/me', authenticate, c.me);
// Accounts are created by the society admin, not self-service (prevents fake residents).
router.post('/register', authenticate, requireRole('admin'), validate({ body: s.registerBody }), c.register);

module.exports = router;
