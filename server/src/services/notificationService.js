const Notification = require('../models/Notification');
const User = require('../models/User');
const sockets = require('../sockets');

// Persist first (so offline users see it later), then push live over Socket.io.
async function notifyUser(userId, { type, title, body, parcelId }) {
  const n = await Notification.create({ userId, type, title, body, parcelId });
  sockets.toUser(userId, 'notification:new', n);
  return n;
}

async function notifyFlat(flatId, payload) {
  const residents = await User.find({ flatId, role: 'resident', isActive: true }).select('_id');
  return Promise.all(residents.map((u) => notifyUser(u._id, payload)));
}

const listFor = (userId) => Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
const markRead = (userId, id) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { readAt: new Date() }, { new: true });
const markAllRead = (userId) => Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });

// Pushes a live event to every resident of the flat plus all guards/admins (who see the whole gate).
async function emitParcelEvent(event, parcel) {
  const residents = await User.find({ flatId: parcel.flatId, role: 'resident', isActive: true }).select('_id');
  const payload = { parcelId: String(parcel._id), flatId: String(parcel.flatId), status: parcel.status };
  residents.forEach((u) => sockets.toUser(u._id, event, payload));
  sockets.toRole('guard', event, payload);
  sockets.toRole('admin', event, payload);
}

// Realtime/notification failures must never fail the business operation that triggered them.
const safely = (promise) => Promise.resolve(promise).catch((e) => {
  if (process.env.NODE_ENV !== 'test') console.error('notification error:', e.message);
});

module.exports = { emitParcelEvent, safely, notifyUser, notifyFlat, listFor, markRead, markAllRead };
