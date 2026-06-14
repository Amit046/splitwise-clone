const commentService = require('../services/comment.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/v1/groups/:groupId/expenses/:expenseId/comments
 * Persists the comment, then emits a socket event to the expense's room
 * so other connected clients viewing this expense get it in real time.
 */
const createComment = asyncHandler(async (req, res) => {
  const expenseId = Number(req.params.expenseId);
  const comment = await commentService.addComment(req.group.id, expenseId, req.user.id, req.body.message);

  const io = req.app.get('io');
  io.to(`expense:${expenseId}`).emit('new_comment', comment);

  return success(res, 201, { comment }, 'Comment added successfully');
});

const listComments = asyncHandler(async (req, res) => {
  const expenseId = Number(req.params.expenseId);
  const comments = await commentService.getComments(req.group.id, expenseId);
  return success(res, 200, { comments }, 'Comments fetched successfully');
});

module.exports = { createComment, listComments };
