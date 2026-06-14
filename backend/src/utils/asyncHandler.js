/**
 * Wraps async route handlers to forward errors to centralized error middleware,
 * avoiding repetitive try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
