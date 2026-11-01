const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/flats', require('./flats'));

module.exports = router;
