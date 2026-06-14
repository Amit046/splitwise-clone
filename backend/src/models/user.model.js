const pool = require('../config/db');

/**
 * User model: thin wrappers around SQL queries for the `users` table.
 * No business logic here — that lives in services.
 */

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

/**
 * Search users by partial email match — used by group invite flow (Section 5)
 * to let a group creator find a user to add.
 */
async function searchByEmail(emailFragment, limit = 5) {
  const { rows } = await pool.query(
    `SELECT id, name, email FROM users
     WHERE email ILIKE $1
     ORDER BY email
     LIMIT $2`,
    [`%${emailFragment}%`, limit]
  );
  return rows;
}

module.exports = { findByEmail, findById, createUser, searchByEmail };
