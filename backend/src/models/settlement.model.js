const pool = require('../config/db');

async function createSettlement({ groupId, paidBy, paidTo, amount, currency, note }) {
  const { rows } = await pool.query(
    `INSERT INTO settlements (group_id, paid_by, paid_to, amount, currency, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, group_id, paid_by, paid_to, amount, currency, note, settled_at, created_at`,
    [groupId, paidBy, paidTo, amount, currency, note || null]
  );
  return rows[0];
}

async function findByGroup(groupId) {
  const { rows } = await pool.query(
    `SELECT s.*, ub.name AS paid_by_name, ut.name AS paid_to_name
     FROM settlements s
     JOIN users ub ON ub.id = s.paid_by
     JOIN users ut ON ut.id = s.paid_to
     WHERE s.group_id = $1
     ORDER BY s.settled_at DESC`,
    [groupId]
  );
  return rows;
}

module.exports = { createSettlement, findByGroup };
