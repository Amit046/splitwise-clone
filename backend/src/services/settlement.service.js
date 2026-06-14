const settlementModel = require('../models/settlement.model');
const groupModel = require('../models/group.model');
const ApiError = require('../utils/ApiError');

async function recordSettlement(groupId, paidBy, { paid_to, amount, currency, note }) {
  if (paid_to === paidBy) {
    throw new ApiError(400, 'Cannot record a settlement to yourself');
  }

  const isMember = await groupModel.isMember(groupId, paid_to);
  if (!isMember) {
    throw new ApiError(400, 'paid_to user is not a member of this group');
  }

  return settlementModel.createSettlement({ groupId, paidBy, paidTo: paid_to, amount, currency, note });
}

async function getGroupSettlements(groupId) {
  return settlementModel.findByGroup(groupId);
}

module.exports = { recordSettlement, getGroupSettlements };
