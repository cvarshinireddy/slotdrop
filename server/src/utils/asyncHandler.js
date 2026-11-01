// Forwards rejected promises to Express' error middleware so controllers stay free of try/catch.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
