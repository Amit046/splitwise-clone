const pool = require('../config/db');

/**
 * Group + group_members model: raw SQL queries.
 */

async function createGroup({ name, description, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO groups (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_by, created_at`,
    [name, description || null, createdBy]
  );
  return rows[0];
}

async function findById(groupId) {
  const { rows } = await pool.query(
    `SELECT id, name, description, created_by, created_at, updated_at
     FROM groups WHERE id = $1`,
    [groupId]
  );
  return rows[0] || null;
}

/**
 * All groups a user belongs to (creator or member), with member count.
 */
async function findGroupsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description, g.created_by, g.created_at,
            COUNT(gm2.user_id) AS member_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     JOIN group_members gm2 ON gm2.group_id = g.id
     GROUP BY g.id, g.name, g.description, g.created_by, g.created_at
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Members of a group with user details and role.
 */
async function getMembers(groupId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return rows;
}

async function isMember(groupId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return rows.length > 0;
}

async function getMemberRole(groupId, userId) {
  const { rows } = await pool.query(
    `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return rows[0]?.role || null;
}

async function addMember(groupId, userId, role = 'member') {
  const { rows } = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO NOTHING
     RETURNING id, group_id, user_id, role, joined_at`,
    [groupId, userId, role]
  );
  return rows[0] || null; // null if already existed (conflict)
}

async function removeMember(groupId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING id`,
    [groupId, userId]
  );
  return rows.length > 0;
}

module.exports = {
  createGroup,
  findById,
  findGroupsForUser,
  getMembers,
  isMember,
  getMemberRole,
  addMember,
  removeMember,
};
