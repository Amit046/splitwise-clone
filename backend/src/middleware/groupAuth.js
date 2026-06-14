const groupModel = require('../models/group.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Ensures req.user is a member of the group identified by req.params.groupId.
 * Throws 404 if the group doesn't exist, 403 if the user isn't a member.
 * Attaches req.group (group row) and req.membershipRole for downstream use.
 *
 * Reused by group, expense, settlement, comment, and CSV import routes —
 * any resource scoped to a group requires membership.
 */
const requireGroupMembership = asyncHandler(async (req, res, next) => {
  const groupId = Number(req.params.groupId);

  const group = await groupModel.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const role = await groupModel.getMemberRole(groupId, req.user.id);
  if (!role) {
    throw new ApiError(403, 'You are not a member of this group');
  }

  req.group = group;
  req.membershipRole = role;
  next();
});

/**
 * Ensures req.membershipRole is 'creator'. Must run after
 * requireGroupMembership. Used for member-removal and group-settings actions.
 */
const requireGroupCreator = (req, res, next) => {
  if (req.membershipRole !== 'creator') {
    throw new ApiError(403, 'Only the group creator can perform this action');
  }
  next();
};

module.exports = { requireGroupMembership, requireGroupCreator };
