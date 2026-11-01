const ApiError = require('../utils/ApiError');

// Usage: router.get('/x', authenticate, requireRole('admin', 'guard'), handler)
module.exports = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
