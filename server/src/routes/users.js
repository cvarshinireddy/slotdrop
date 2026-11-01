const router = require('express').Router();
const { z } = require('zod');
const c = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate, requireRole('admin'));
router.get('/', c.listUsers);
router.patch('/:id/active', validate({ params: s.idParams, body: z.object({ isActive: z.boolean() }) }), c.setActive);

module.exports = router;
