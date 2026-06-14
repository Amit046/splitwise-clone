const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies JWT from Authorization header (Bearer <token>).
 * Attaches { id, email } to req.user on success.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token missing');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
});

module.exports = authMiddleware;
