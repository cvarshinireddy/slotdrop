const ROLES = Object.freeze({ RESIDENT: 'resident', GUARD: 'guard', ADMIN: 'admin' });

const PARCEL_STATUS = Object.freeze({
  RECEIVED: 'RECEIVED',
  SLOT_BOOKED: 'SLOT_BOOKED',
  DELIVERED: 'DELIVERED',
});

const BOOKING_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' });

const AUDIT_ACTIONS = Object.freeze([
  'RECEIVED', 'SLOT_BOOKED', 'SLOT_CANCELLED', 'DELEGATED', 'DELIVERED', 'VERIFY_FAILED', 'REMINDER_SENT',
]);

const COURIERS = Object.freeze([
  'Amazon', 'Flipkart', 'Swiggy Instamart', 'Blinkit', 'Zomato', 'Myntra', 'Delhivery', 'BlueDart', 'Other',
]);

module.exports = { ROLES, PARCEL_STATUS, BOOKING_STATUS, AUDIT_ACTIONS, COURIERS };
