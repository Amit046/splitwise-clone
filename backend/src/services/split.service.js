const ApiError = require('../utils/ApiError');

/**
 * Split calculation service.
 *
 * Converts a total amount + split_type + raw input (participants, percentages,
 * shares, or explicit amounts) into an array of { user_id, owed_amount,
 * percentage?, shares? } rows ready for insertion into expense_splits.
 *
 * ROUNDING STRATEGY:
 * All monetary math is done in integer paise/cents (amount * 100) to avoid
 * floating-point precision issues, then converted back to a 2-decimal number
 * at the end. Any leftover remainder from division (e.g. splitting 100 three
 * ways = 33.33 + 33.33 + 33.34) is assigned to the FIRST participant in the
 * list, ensuring the sum of owed_amounts always exactly equals the total.
 */

const toCents = (amount) => Math.round(amount * 100);
const fromCents = (cents) => Math.round(cents) / 100;

/**
 * Distributes `totalCents` across `count` participants as evenly as possible,
 * returning an array of integer cent amounts that sum exactly to totalCents.
 * Remainder cents go to the first N participants (1 cent each).
 */
function distributeCentsEvenly(totalCents, count) {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * EQUAL SPLIT
 * Divides totalAmount equally among all participant user_ids.
 */
function calculateEqualSplit({ totalAmount, userIds }) {
  if (!userIds || userIds.length === 0) {
    throw new ApiError(400, 'Equal split requires at least one participant');
  }

  const totalCents = toCents(totalAmount);
  const parts = distributeCentsEvenly(totalCents, userIds.length);

  return userIds.map((userId, i) => ({
    user_id: userId,
    owed_amount: fromCents(parts[i]),
  }));
}

/**
 * UNEQUAL SPLIT
 * Each participant has an explicit owed amount (splitDetails: { userId: amount }).
 * Sum of amounts must equal totalAmount (within 1 cent tolerance for rounding).
 */
function calculateUnequalSplit({ totalAmount, splitDetails }) {
  const entries = Object.entries(splitDetails || {});
  if (entries.length === 0) {
    throw new ApiError(400, 'Unequal split requires split_details with amounts per user');
  }

  let sumCents = 0;
  const result = entries.map(([userId, amount]) => {
    if (typeof amount !== 'number' || amount < 0) {
      throw new ApiError(400, `Invalid amount for user ${userId} in unequal split`);
    }
    const cents = toCents(amount);
    sumCents += cents;
    return { user_id: Number(userId), owed_amount: fromCents(cents) };
  });

  const totalCents = toCents(totalAmount);
  if (Math.abs(sumCents - totalCents) > 1) {
    throw new ApiError(
      400,
      `Unequal split amounts (${fromCents(sumCents)}) do not sum to the expense total (${totalAmount})`
    );
  }

  return result;
}

/**
 * PERCENTAGE SPLIT
 * Each participant has a percentage (splitDetails: { userId: percentage }).
 * Percentages must sum to 100 (within 0.01 tolerance).
 * owed_amount = totalAmount * percentage / 100, rounded; remainder distributed
 * to the first participant to ensure exact sum.
 */
function calculatePercentageSplit({ totalAmount, splitDetails }) {
  const entries = Object.entries(splitDetails || {});
  if (entries.length === 0) {
    throw new ApiError(400, 'Percentage split requires split_details with percentages per user');
  }

  let percentageSum = 0;
  for (const [, pct] of entries) {
    if (typeof pct !== 'number' || pct < 0 || pct > 100) {
      throw new ApiError(400, 'Each percentage must be between 0 and 100');
    }
    percentageSum += pct;
  }

  if (Math.abs(percentageSum - 100) > 0.01) {
    throw new ApiError(400, `Split percentages must sum to 100 (got ${percentageSum})`);
  }

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;
  const result = entries.map(([userId, pct], i) => {
    let cents = Math.round((totalCents * pct) / 100);
    allocatedCents += cents;
    return { user_id: Number(userId), owed_amount_cents: cents, percentage: pct, _index: i };
  });

  // Fix rounding drift: adjust the first entry by the difference
  const drift = totalCents - allocatedCents;
  if (drift !== 0) {
    result[0].owed_amount_cents += drift;
  }

  return result.map(({ user_id, owed_amount_cents, percentage }) => ({
    user_id,
    owed_amount: fromCents(owed_amount_cents),
    percentage,
  }));
}

/**
 * SHARE SPLIT
 * Each participant has a number of shares (splitDetails: { userId: shares }).
 * owed_amount = totalAmount * (userShares / totalShares), rounded; remainder
 * distributed to the first participant to ensure exact sum.
 */
function calculateShareSplit({ totalAmount, splitDetails }) {
  const entries = Object.entries(splitDetails || {});
  if (entries.length === 0) {
    throw new ApiError(400, 'Share split requires split_details with shares per user');
  }

  let totalShares = 0;
  for (const [, shares] of entries) {
    if (typeof shares !== 'number' || shares <= 0) {
      throw new ApiError(400, 'Each share value must be a positive number');
    }
    totalShares += shares;
  }

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;
  const result = entries.map(([userId, shares]) => {
    const cents = Math.round((totalCents * shares) / totalShares);
    allocatedCents += cents;
    return { user_id: Number(userId), owed_amount_cents: cents, shares };
  });

  const drift = totalCents - allocatedCents;
  if (drift !== 0) {
    result[0].owed_amount_cents += drift;
  }

  return result.map(({ user_id, owed_amount_cents, shares }) => ({
    user_id,
    owed_amount: fromCents(owed_amount_cents),
    shares,
  }));
}

/**
 * Main entry point: routes to the correct calculator based on split_type.
 * Returns an array of { user_id, owed_amount, percentage?, shares? }.
 */
function calculateSplits({ splitType, totalAmount, userIds, splitDetails }) {
  if (totalAmount < 0) {
    throw new ApiError(400, 'Expense amount cannot be negative');
  }

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit({ totalAmount, userIds });
    case 'unequal':
      return calculateUnequalSplit({ totalAmount, splitDetails });
    case 'percentage':
      return calculatePercentageSplit({ totalAmount, splitDetails });
    case 'share':
      return calculateShareSplit({ totalAmount, splitDetails });
    default:
      throw new ApiError(400, `Unsupported split_type: ${splitType}`);
  }
}

module.exports = { calculateSplits, toCents, fromCents };
