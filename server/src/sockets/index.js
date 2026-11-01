const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

let io = null;

// Rooms: user:<id> (personal), role:<role> (e.g. all guards). Auth happens once, in the handshake.
function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientOrigin, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, env.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) return next(new Error('unauthorized'));
      socket.data.user = { id: user.id, role: user.role, flatId: user.flatId && String(user.flatId) };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
  });
  return io;
}

// No-ops when sockets are not initialised (unit tests, cron-only scripts), so services never crash on emit.
const toUser = (userId, event, payload) => io && io.to(`user:${userId}`).emit(event, payload);
const toRole = (role, event, payload) => io && io.to(`role:${role}`).emit(event, payload);
const toAll = (event, payload) => io && io.emit(event, payload);

module.exports = { init, toUser, toRole, toAll };
