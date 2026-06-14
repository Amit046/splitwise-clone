const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;

/**
 * Registers a new user.
 * - Checks for duplicate email
 * - Hashes password with bcrypt
 * - Returns user (without password_hash) + JWT
 */
async function register({ name, email, password }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userModel.createUser({ name, email, passwordHash });

  const token = signToken(user);
  return { user, token };
}

/**
 * Authenticates a user by email/password.
 * Returns user (without password_hash) + JWT on success.
 */
async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user);

  // Strip password_hash before returning
  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
}

/**
 * Returns the current user's profile (for /me endpoint).
 */
async function getCurrentUser(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}

module.exports = { register, login, getCurrentUser };
