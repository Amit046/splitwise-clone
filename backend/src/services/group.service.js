const groupModel = require('../models/group.model');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

/**
 * Creates a group and adds the creator as the first member with role 'creator'.
 */
async function createGroup({ name, description, createdBy }) {
  const group = await groupModel.createGroup({ name, description, createdBy });
  await groupModel.addMember(group.id, createdBy, 'creator');
  return group;
}

async function listUserGroups(userId) {
  return groupModel.findGroupsForUser(userId);
}

/**
 * Returns group details + member list. Assumes membership already verified
 * by requireGroupMembership middleware.
 */
async function getGroupDetails(groupId) {
  const group = await groupModel.findById(groupId);
  const members = await groupModel.getMembers(groupId);
  return { ...group, members };
}

/**
 * Adds a member to a group by email.
 * - Target user must exist (no email-invite flow — see DECISIONS.md D4 / D14).
 * - Prevents duplicate membership (handled at DB level via ON CONFLICT, but we
 *   check first to return a clear 409 instead of a silent no-op).
 */
async function addMemberByEmail(groupId, email) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(404, 'No user found with this email. They must register first.');
  }

  const alreadyMember = await groupModel.isMember(groupId, user.id);
  if (alreadyMember) {
    throw new ApiError(409, 'User is already a member of this group');
  }

  const membership = await groupModel.addMember(groupId, user.id, 'member');
  return { user: { id: user.id, name: user.name, email: user.email }, membership };
}

/**
 * Removes a member from a group.
 * - Cannot remove the group creator (must transfer ownership or delete group —
 *   both out of scope; see DECISIONS.md).
 * - Target user must currently be a member.
 */
async function removeMember(groupId, targetUserId) {
  const role = await groupModel.getMemberRole(groupId, targetUserId);
  if (!role) {
    throw new ApiError(404, 'User is not a member of this group');
  }

  if (role === 'creator') {
    throw new ApiError(400, 'The group creator cannot be removed from the group');
  }

  await groupModel.removeMember(groupId, targetUserId);
  return true;
}

module.exports = {
  createGroup,
  listUserGroups,
  getGroupDetails,
  addMemberByEmail,
  removeMember,
};
