const groupService = require('../services/group.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/v1/groups
 */
const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup({
    ...req.body,
    createdBy: req.user.id,
  });
  return success(res, 201, { group }, 'Group created successfully');
});

/**
 * GET /api/v1/groups
 * Lists all groups the current user belongs to.
 */
const listGroups = asyncHandler(async (req, res) => {
  const groups = await groupService.listUserGroups(req.user.id);
  return success(res, 200, { groups }, 'Groups fetched successfully');
});

/**
 * GET /api/v1/groups/:groupId
 * Requires requireGroupMembership middleware.
 */
const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getGroupDetails(req.group.id);
  return success(res, 200, { group }, 'Group details fetched successfully');
});

/**
 * POST /api/v1/groups/:groupId/members
 * Adds a member by email. Any existing member can add (documented tradeoff).
 */
const addMember = asyncHandler(async (req, res) => {
  const result = await groupService.addMemberByEmail(req.group.id, req.body.email);
  return success(res, 201, result, 'Member added successfully');
});

/**
 * DELETE /api/v1/groups/:groupId/members/:userId
 * Requires requireGroupCreator middleware.
 */
const removeMember = asyncHandler(async (req, res) => {
  await groupService.removeMember(req.group.id, Number(req.params.userId));
  return success(res, 200, null, 'Member removed successfully');
});

module.exports = { createGroup, listGroups, getGroup, addMember, removeMember };
