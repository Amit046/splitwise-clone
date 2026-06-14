const pool = require('../config/db');

/**
 * Expense + expense_splits model.
 * Functions accepting `client` use it for transactional queries
 * (called from within expense.service.js's pool.connect() block).
 */

async function createExpense(client, { groupId, paidBy, description, amount, currency, splitType, expenseDate, notes }) {
  const { rows } = await client.query(
    `INSERT INTO expenses (group_id, paid_by, description, amount, currency, split_type, expense_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, group_id, paid_by, description, amount, currency, split_type, expense_date, notes, created_at, updated_at`,
    [groupId, paidBy, description, amount, currency, splitType, expenseDate, notes || null]
  );
  return rows[0];
}

async function insertSplits(client, expenseId, splits) {
  for (const split of splits) {
    await client.query(
      `INSERT INTO expense_splits (expense_id, user_id, owed_amount, percentage, shares)
       VALUES ($1, $2, $3, $4, $5)`,
      [expenseId, split.user_id, split.owed_amount, split.percentage ?? null, split.shares ?? null]
    );
  }
}

async function deleteSplitsForExpense(client, expenseId) {
  await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);
}

async function updateExpense(client, expenseId, { description, amount, currency, splitType, expenseDate, notes }) {
  const { rows } = await client.query(
    `UPDATE expenses
     SET description = $1, amount = $2, currency = $3, split_type = $4,
         expense_date = $5, notes = $6, updated_at = NOW()
     WHERE id = $7
     RETURNING id, group_id, paid_by, description, amount, currency, split_type, expense_date, notes, created_at, updated_at`,
    [description, amount, currency, splitType, expenseDate, notes || null, expenseId]
  );
  return rows[0];
}

async function deleteExpense(client, expenseId) {
  // expense_splits and expense_comments cascade via FK ON DELETE CASCADE
  const { rows } = await client.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [expenseId]);
  return rows.length > 0;
}

async function findById(expenseId) {
  const { rows } = await pool.query(
    `SELECT e.*, u.name AS paid_by_name, u.email AS paid_by_email
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.id = $1`,
    [expenseId]
  );
  return rows[0] || null;
}

async function getSplitsForExpense(expenseId) {
  const { rows } = await pool.query(
    `SELECT es.id, es.user_id, u.name, u.email, es.owed_amount, es.percentage, es.shares
     FROM expense_splits es
     JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = $1
     ORDER BY es.id`,
    [expenseId]
  );
  return rows;
}

/**
 * Group expense history, paginated, newest first.
 */
async function findByGroup(groupId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT e.id, e.group_id, e.paid_by, u.name AS paid_by_name, e.description,
            e.amount, e.currency, e.split_type, e.expense_date, e.notes, e.created_at
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.group_id = $1
     ORDER BY e.expense_date DESC, e.id DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );
  return rows;
}

module.exports = {
  createExpense,
  insertSplits,
  deleteSplitsForExpense,
  updateExpense,
  deleteExpense,
  findById,
  getSplitsForExpense,
  findByGroup,
};
