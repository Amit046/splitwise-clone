const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

/**
 * Signs a JWT containing minimal user identity claims.
 * Payload kept small (id, email) — avoid embedding sensitive data.
 */
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { signToken, verifyToken };
