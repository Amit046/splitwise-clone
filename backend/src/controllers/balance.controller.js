const balanceService = require('../services/balance.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/v1/groups/:groupId/balances
 */
const getGroupBalances = asyncHandler(async (req, res) => {
  const data = await balanceService.getGroupBalances(req.group.id);
  return success(res, 200, data, 'Group balances fetched successfully');
});

/**
 * GET /api/v1/balances/me
 * Overall net balance for the current user across all groups.
 */
const getMyBalance = asyncHandler(async (req, res) => {
  const data = await balanceService.getUserOverallBalance(req.user.id);
  return success(res, 200, data, 'User balance fetched successfully');
});

module.exports = { getGroupBalances, getMyBalance };
