const balanceModel = require('../models/balance.model');

async function getGroupBalances(groupId) {
  const balances = await balanceModel.getGroupBalances(groupId);
  const simplifiedDebts = await balanceModel.getSimplifiedDebts(groupId);
  return { balances, simplified_debts: simplifiedDebts };
}

async function getUserOverallBalance(userId) {
  const balance = await balanceModel.getUserOverallBalance(userId);
  return { balance };
}

module.exports = { getGroupBalances, getUserOverallBalance };
