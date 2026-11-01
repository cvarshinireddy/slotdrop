const router = require('express').Router();
const c = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('./schemas');

router.use(authenticate);
router.get('/', c.list);
router.post('/read-all', c.readAll);
router.patch('/:id/read', validate({ params: s.idParams }), c.read);

module.exports = router;
