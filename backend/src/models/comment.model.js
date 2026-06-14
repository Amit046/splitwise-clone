const pool = require('../config/db');

async function createComment({ expenseId, userId, message }) {
  const { rows } = await pool.query(
    `INSERT INTO expense_comments (expense_id, user_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, expense_id, user_id, message, created_at`,
    [expenseId, userId, message]
  );
  return rows[0];
}

async function findByExpense(expenseId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.expense_id, c.user_id, u.name, c.message, c.created_at
     FROM expense_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.expense_id = $1
     ORDER BY c.created_at ASC`,
    [expenseId]
  );
  return rows;
}

module.exports = { createComment, findByExpense };
