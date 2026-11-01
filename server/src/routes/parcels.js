const router = require('express').Router();
const c = require('../controllers/parcelController');
const { authenticate } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { uploadPhoto } = require('../middleware/upload');
const s = require('./schemas');

router.use(authenticate);
// multer runs first (it parses multipart), then zod validates the text fields.
router.post('/', requireRole('guard'), uploadPhoto, validate({ body: s.parcelBody }), c.create);
router.get('/', validate({ query: s.parcelListQuery }), c.list);
router.get('/:id', validate({ params: s.idParams }), c.get);
router.get('/:id/timeline', validate({ params: s.idParams }), c.timeline);

module.exports = router;
