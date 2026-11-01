// Operational errors carry an HTTP status and a stable machine-readable code.
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg, code = 'BAD_REQUEST', details) { return new ApiError(400, code, msg, details); }
  static unauthorized(msg = 'Please sign in again.') { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'You do not have access to this.') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Not found.') { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(msg, code = 'CONFLICT') { return new ApiError(409, code, msg); }
}
module.exports = ApiError;
