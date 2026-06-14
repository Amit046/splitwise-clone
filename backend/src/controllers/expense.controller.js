const expenseService = require('../services/expense.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/v1/groups/:groupId/expenses
 * Requires requireGroupMembership. paid_by = current user.
 */
const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.group.id, req.user.id, req.body);
  return success(res, 201, { expense }, 'Expense created successfully');
});

/**
 * GET /api/v1/groups/:groupId/expenses
 * Group expense history, paginated via ?limit & ?offset query params.
 */
const listExpenses = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const expenses = await expenseService.getGroupExpenseHistory(req.group.id, { limit, offset });
  return success(res, 200, { expenses }, 'Expenses fetched successfully');
});

/**
 * GET /api/v1/groups/:groupId/expenses/:expenseId
 */
const getExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpense(req.group.id, Number(req.params.expenseId));
  return success(res, 200, { expense }, 'Expense fetched successfully');
});

/**
 * PUT /api/v1/groups/:groupId/expenses/:expenseId
 */
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.group.id, Number(req.params.expenseId), req.body);
  return success(res, 200, { expense }, 'Expense updated successfully');
});

/**
 * DELETE /api/v1/groups/:groupId/expenses/:expenseId
 */
const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.group.id, Number(req.params.expenseId));
  return success(res, 200, null, 'Expense deleted successfully');
});

module.exports = { createExpense, listExpenses, getExpense, updateExpense, deleteExpense };
