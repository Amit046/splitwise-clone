const settlementService = require('../services/settlement.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createSettlement = asyncHandler(async (req, res) => {
  const settlement = await settlementService.recordSettlement(req.group.id, req.user.id, req.body);
  return success(res, 201, { settlement }, 'Settlement recorded successfully');
});

const listSettlements = asyncHandler(async (req, res) => {
  const settlements = await settlementService.getGroupSettlements(req.group.id);
  return success(res, 200, { settlements }, 'Settlements fetched successfully');
});

module.exports = { createSettlement, listSettlements };
