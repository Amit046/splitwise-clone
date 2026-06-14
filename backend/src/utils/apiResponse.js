/**
 * Standardized API response shapes.
 * Success: { success: true, data, message? }
 * Error:   { success: false, message, errors? }
 */

function success(res, statusCode = 200, data = null, message = 'Success') {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, statusCode = 500, message = 'Something went wrong', errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { success, error };
