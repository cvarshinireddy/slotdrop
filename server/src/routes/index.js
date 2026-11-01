const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/flats', require('./flats'));
router.use('/parcels', require('./parcels'));
router.use('/slots', require('./slots'));
router.use('/admin', require('./adminSlots'));
router.use('/bookings', require('./bookings'));

module.exports = router;
