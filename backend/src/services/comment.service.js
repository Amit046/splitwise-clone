const commentModel = require('../models/comment.model');
const expenseModel = require('../models/expense.model');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

async function addComment(groupId, expenseId, userId, message) {
  const expense = await expenseModel.findById(expenseId);
  if (!expense || expense.group_id !== groupId) {
    throw new ApiError(404, 'Expense not found in this group');
  }

  const comment = await commentModel.createComment({ expenseId, userId, message });
  const user = await userModel.findById(userId);
  return { ...comment, name: user.name };
}

async function getComments(groupId, expenseId) {
  const expense = await expenseModel.findById(expenseId);
  if (!expense || expense.group_id !== groupId) {
    throw new ApiError(404, 'Expense not found in this group');
  }
  return commentModel.findByExpense(expenseId);
}

module.exports = { addComment, getComments };
