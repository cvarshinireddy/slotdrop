const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 10;

// Constant dummy hash so "unknown user" and "wrong password" take similar time (no user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

async function login(identifier, password) {
  const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: identifier };
  const user = await User.findOne(query).select('+passwordHash').populate('flatId');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email/phone or password is incorrect.');
  return { token: signToken(user), user };
}

async function createUser({ password, ...rest }) {
  const passwordHash = await hashPassword(password);
  return User.create({ ...rest, passwordHash });
}

module.exports = { hashPassword, signToken, login, createUser };
