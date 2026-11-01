const router = require('express').Router();
const c = require('../controllers/slotController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate, requireRole('admin'));
router.get('/slot-templates', c.listTemplates);
router.put('/slot-templates', validate({ body: s.templatesBody }), c.replaceTemplates);

module.exports = router;
