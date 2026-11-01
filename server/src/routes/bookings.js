const router = require('express').Router();
const c = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate, requireRole('resident'));
router.post('/', validate({ body: s.bookingBody }), c.create);
router.get('/', c.listMine);
router.get('/:id', validate({ params: s.idParams }), c.get);
router.delete('/:id', validate({ params: s.idParams }), c.cancel);

module.exports = router;
