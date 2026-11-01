const router = require('express').Router();
const c = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate);
// Guards need autocomplete at the gate; only admins can list everything or create flats.
router.get('/search', requireRole('guard', 'admin'), c.searchFlats);
router.get('/', requireRole('admin'), c.listFlats);
router.post('/', requireRole('admin'), validate({ body: s.flatBody }), c.createFlat);

module.exports = router;
