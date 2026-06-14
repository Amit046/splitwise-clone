const pool = require('../config/db');
const expenseModel = require('../models/expense.model');
const groupModel = require('../models/group.model');
const { calculateSplits } = require('./split.service');
const ApiError = require('../utils/ApiError');

/**
 * Validates that every user_id referenced in participants/split_details is
 * actually a member of the group. Prevents splitting an expense with users
 * outside the group (data integrity for balance calculations).
 */
async function assertAllUsersAreGroupMembers(groupId, userIds) {
  const members = await groupModel.getMembers(groupId);
  const memberIds = new Set(members.map((m) => m.id));
  for (const userId of userIds) {
    if (!memberIds.has(userId)) {
      throw new ApiError(400, `User ${userId} is not a member of this group`);
    }
  }
}

function extractUserIds({ split_type, participants, split_details }) {
  if (split_type === 'equal') {
    return participants;
  }
  return Object.keys(split_details || {}).map(Number);
}

/**
 * Creates an expense + its expense_splits atomically.
 * On any failure (validation inside calculateSplits, DB error), the
 * transaction is rolled back and no partial rows are persisted.
 */
async function createExpense(groupId, paidBy, payload) {
  const userIds = extractUserIds(payload);
  if (!userIds || userIds.length === 0) {
    throw new ApiError(400, 'At least one participant is required');
  }

  await assertAllUsersAreGroupMembers(groupId, userIds);

  // Compute splits BEFORE starting the transaction — if this throws
  // (e.g. percentages don't sum to 100), nothing has touched the DB yet.
  const splits = calculateSplits({
    splitType: payload.split_type,
    totalAmount: payload.amount,
    userIds: payload.participants,
    splitDetails: payload.split_details,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const expense = await expenseModel.createExpense(client, {
      groupId,
      paidBy,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      splitType: payload.split_type,
      expenseDate: payload.expense_date,
      notes: payload.notes,
    });

    await expenseModel.insertSplits(client, expense.id, splits);

    await client.query('COMMIT');

    const fullSplits = await expenseModel.getSplitsForExpense(expense.id);
    return { ...expense, splits: fullSplits };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Updates an expense and recomputes its splits atomically.
 * Old splits are deleted and replaced with newly calculated ones within
 * the same transaction — if recalculation fails, the old splits remain
 * (rollback), so the expense is never left in an inconsistent state.
 */
async function updateExpense(groupId, expenseId, payload) {
  const existing = await expenseModel.findById(expenseId);
  if (!existing || existing.group_id !== groupId) {
    throw new ApiError(404, 'Expense not found in this group');
  }

  const userIds = extractUserIds(payload);
  if (!userIds || userIds.length === 0) {
    throw new ApiError(400, 'At least one participant is required');
  }

  await assertAllUsersAreGroupMembers(groupId, userIds);

  const splits = calculateSplits({
    splitType: payload.split_type,
    totalAmount: payload.amount,
    userIds: payload.participants,
    splitDetails: payload.split_details,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await expenseModel.updateExpense(client, expenseId, {
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      splitType: payload.split_type,
      expenseDate: payload.expense_date,
      notes: payload.notes,
    });

    await expenseModel.deleteSplitsForExpense(client, expenseId);
    await expenseModel.insertSplits(client, expenseId, splits);

    await client.query('COMMIT');

    const fullSplits = await expenseModel.getSplitsForExpense(expenseId);
    return { ...updated, splits: fullSplits };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes an expense. expense_splits and expense_comments cascade via FK.
 * Wrapped in a transaction for consistency with create/update, though a
 * single DELETE is already atomic — keeps the pattern uniform and leaves
 * room for future side-effects (e.g. audit logging) inside the same tx.
 */
async function deleteExpense(groupId, expenseId) {
  const existing = await expenseModel.findById(expenseId);
  if (!existing || existing.group_id !== groupId) {
    throw new ApiError(404, 'Expense not found in this group');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await expenseModel.deleteExpense(client, expenseId);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getExpense(groupId, expenseId) {
  const expense = await expenseModel.findById(expenseId);
  if (!expense || expense.group_id !== groupId) {
    throw new ApiError(404, 'Expense not found in this group');
  }
  const splits = await expenseModel.getSplitsForExpense(expenseId);
  return { ...expense, splits };
}

async function getGroupExpenseHistory(groupId, { limit, offset } = {}) {
  return expenseModel.findByGroup(groupId, { limit, offset });
}

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpense,
  getGroupExpenseHistory,
};
