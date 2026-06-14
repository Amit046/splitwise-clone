const { error: errorResponse } = require('../utils/apiResponse');
const { nodeEnv } = require('../config/env');

/**
 * Centralized error handler. Must be registered LAST, after all routes.
 * - ApiError instances: use their statusCode/message/errors as-is.
 * - Unknown errors: log full details, return generic 500 to client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  } else if (nodeEnv !== 'production') {
    console.error(`[${statusCode}] ${err.message}`);
  }

  return errorResponse(res, statusCode, message, err.errors || null);
}

/**
 * 404 handler for unmatched routes. Registered after all routes,
 * before errorHandler.
 */
function notFoundHandler(req, res) {
  return errorResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = { errorHandler, notFoundHandler };
