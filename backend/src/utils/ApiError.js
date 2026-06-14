/**
 * Custom error class for known, intentional error responses
 * (e.g. validation failures, auth errors, not found).
 * Errors thrown that are NOT instances of ApiError are treated
 * as unexpected 500s by the centralized error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

module.exports = ApiError;
