const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err.code === 11000) { // Mongo duplicate key
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ error: { code: 'DUPLICATE', message: `That ${field} is already in use.` } });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid id.' } });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } });
};

module.exports = { notFound, errorHandler };
