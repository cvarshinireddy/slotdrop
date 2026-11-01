const router = require('express').Router();
const c = require('../controllers/slotController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate);
router.get('/', validate({ query: s.slotsQuery }), c.list);
router.get('/today', requireRole('guard', 'admin'), c.today);
router.patch('/:id', requireRole('admin'), validate({ params: s.idParams, body: s.slotPatchBody }), c.update);

module.exports = router;
