const express = require('express');
const groupController = require('../controllers/group.controller');
const expenseRoutes = require('./expense.routes');
const settlementRoutes = require('./settlement.routes');
const csvRoutes = require('./csv.routes');
const balanceController = require('../controllers/balance.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { requireGroupMembership, requireGroupCreator } = require('../middleware/groupAuth');
const {
  createGroupSchema,
  addMemberSchema,
  groupIdParamSchema,
  memberParamSchema,
} = require('../middleware/validators/group.validator');

const router = express.Router();

// All group routes require authentication
router.use(authMiddleware);

router.post('/', validate(createGroupSchema), groupController.createGroup);
router.get('/', groupController.listGroups);

router.get(
  '/:groupId',
  validate(groupIdParamSchema, 'params'),
  requireGroupMembership,
  groupController.getGroup
);

router.post(
  '/:groupId/members',
  validate(groupIdParamSchema, 'params'),
  requireGroupMembership,
  validate(addMemberSchema),
  groupController.addMember
);

router.delete(
  '/:groupId/members/:userId',
  validate(memberParamSchema, 'params'),
  requireGroupMembership,
  requireGroupCreator,
  groupController.removeMember
);

// Expense routes, nested under a group (requireGroupMembership applied inside)
router.use('/:groupId/expenses', validate(groupIdParamSchema, 'params'), expenseRoutes);
router.use('/:groupId/settlements', validate(groupIdParamSchema, 'params'), settlementRoutes);
router.use('/:groupId/csv', validate(groupIdParamSchema, 'params'), csvRoutes);

router.get(
  '/:groupId/balances',
  validate(groupIdParamSchema, 'params'),
  requireGroupMembership,
  balanceController.getGroupBalances
);

module.exports = router;
