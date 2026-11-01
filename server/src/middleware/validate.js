const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

// validate({ body: schema, query: schema, params: schema }) — replaces req.* with parsed, trimmed data.
module.exports = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (schemas[key]) req[key] = schemas[key].parse(req[key]);
    }
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(ApiError.badRequest('Please check the highlighted fields.', 'VALIDATION_ERROR', details));
    }
    next(err);
  }
};
