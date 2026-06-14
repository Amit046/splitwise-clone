const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  return success(res, 201, { user, token }, 'Account created successfully');
});

/**
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  return success(res, 200, { user, token }, 'Logged in successfully');
});

/**
 * POST /api/v1/auth/logout
 * Stateless JWT — logout is handled client-side by discarding the token.
 * Endpoint exists for a consistent API surface and future blacklist support.
 */
const logout = asyncHandler(async (req, res) => {
  return success(res, 200, null, 'Logged out successfully');
});

/**
 * GET /api/v1/auth/me
 * Requires authMiddleware — returns the current authenticated user.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return success(res, 200, { user }, 'Current user fetched');
});

module.exports = { register, login, logout, getMe };
