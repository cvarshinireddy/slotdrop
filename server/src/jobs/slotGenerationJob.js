const cron = require('node-cron');
const { generateSlots } = require('../services/slotService');

// 00:05 IST daily keeps a rolling 7-day window of bookable slots.
const start = () =>
  cron.schedule('5 0 * * *', () => generateSlots(7).catch((e) => console.error('slot job', e)), { timezone: 'Asia/Kolkata' });

module.exports = { start };
