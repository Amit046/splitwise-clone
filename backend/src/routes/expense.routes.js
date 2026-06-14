const express = require('express');
const expenseController = require('../controllers/expense.controller');
const commentController = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const { requireGroupMembership } = require('../middleware/groupAuth');
const {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
} = require('../middleware/validators/expense.validator');
const { createCommentSchema } = require('../middleware/validators/comment.validator');

// mergeParams: true so :groupId from the parent router is available here
const router = express.Router({ mergeParams: true });

// All expense routes are group-scoped: require membership in :groupId
router.use(requireGroupMembership);

router.post('/', validate(createExpenseSchema), expenseController.createExpense);
router.get('/', expenseController.listExpenses);

router.get(
  '/:expenseId',
  validate(expenseIdParamSchema, 'params'),
  expenseController.getExpense
);

router.put(
  '/:expenseId',
  validate(expenseIdParamSchema, 'params'),
  validate(updateExpenseSchema),
  expenseController.updateExpense
);

router.delete(
  '/:expenseId',
  validate(expenseIdParamSchema, 'params'),
  expenseController.deleteExpense
);

router.post(
  '/:expenseId/comments',
  validate(expenseIdParamSchema, 'params'),
  validate(createCommentSchema),
  commentController.createComment
);

router.get(
  '/:expenseId/comments',
  validate(expenseIdParamSchema, 'params'),
  commentController.listComments
);

module.exports = router;
