const pool = require('../config/db');

/**
 * Net balance per user in a group:
 * balance = (total paid on expenses) - (total owed via splits)
 *         + (settlements received) - (settlements paid)
 * Positive = others owe this user. Negative = this user owes others.
 */
async function getGroupBalances(groupId) {
  const { rows } = await pool.query(
    `
    WITH paid AS (
      SELECT paid_by AS user_id, COALESCE(SUM(amount), 0) AS total
      FROM expenses WHERE group_id = $1 GROUP BY paid_by
    ),
    owed AS (
      SELECT es.user_id, COALESCE(SUM(es.owed_amount), 0) AS total
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.group_id = $1 GROUP BY es.user_id
    ),
    settled_in AS (
      SELECT paid_to AS user_id, COALESCE(SUM(amount), 0) AS total
      FROM settlements WHERE group_id = $1 GROUP BY paid_to
    ),
    settled_out AS (
      SELECT paid_by AS user_id, COALESCE(SUM(amount), 0) AS total
      FROM settlements WHERE group_id = $1 GROUP BY paid_by
    ),
    members AS (
      SELECT user_id FROM group_members WHERE group_id = $1
    )
    SELECT m.user_id, u.name, u.email,
      ROUND(
        COALESCE(p.total, 0) - COALESCE(o.total, 0)
        + COALESCE(si.total, 0) - COALESCE(so.total, 0)
      , 2) AS balance
    FROM members m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN paid p ON p.user_id = m.user_id
    LEFT JOIN owed o ON o.user_id = m.user_id
    LEFT JOIN settled_in si ON si.user_id = m.user_id
    LEFT JOIN settled_out so ON so.user_id = m.user_id
    ORDER BY u.name
    `,
    [groupId]
  );
  return rows;
}

/**
 * Pairwise "who owes whom" within a group, derived from per-user net balances
 * via a simple greedy settlement algorithm (creditors matched to debtors).
 */
async function getSimplifiedDebts(groupId) {
  const balances = await getGroupBalances(groupId);

  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, balance: Number(b.balance) }));
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, balance: Number(b.balance) }));

  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.balance, creditor.balance);

    if (amount > 0.001) {
      transactions.push({
        from_user_id: debtor.user_id,
        from_name: debtor.name,
        to_user_id: creditor.user_id,
        to_name: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return transactions;
}

/**
 * A single user's net balance across ALL groups they belong to.
 */
async function getUserOverallBalance(userId) {
  const { rows } = await pool.query(
    `
    WITH paid AS (
      SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE paid_by = $1
    ),
    owed AS (
      SELECT COALESCE(SUM(owed_amount), 0) AS total FROM expense_splits WHERE user_id = $1
    ),
    settled_in AS (
      SELECT COALESCE(SUM(amount), 0) AS total FROM settlements WHERE paid_to = $1
    ),
    settled_out AS (
      SELECT COALESCE(SUM(amount), 0) AS total FROM settlements WHERE paid_by = $1
    )
    SELECT ROUND(
      (SELECT total FROM paid) - (SELECT total FROM owed)
      + (SELECT total FROM settled_in) - (SELECT total FROM settled_out)
    , 2) AS balance
    `,
    [userId]
  );
  return Number(rows[0].balance);
}

module.exports = { getGroupBalances, getSimplifiedDebts, getUserOverallBalance };
