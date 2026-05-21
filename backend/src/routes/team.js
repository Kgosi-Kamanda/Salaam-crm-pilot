// src/routes/team.js
const express = require('express');
const bcrypt  = require('bcrypt');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, adminOnly, agentOrAdmin, logAction } = require('../middleware/auth');
const router = express.Router();
router.use(auth, sanitizeMiddleware);

// GET /api/team
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT tm.id, tm.uuid, tm.full_name, tm.email, tm.role, tm.is_active, tm.last_login_at, tm.created_at,
              COALESCE(array_agg(DISTINCT mc.platform) FILTER (WHERE mc.platform IS NOT NULL), '{}') AS channels,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name, 'color', d.color)) FILTER (WHERE d.id IS NOT NULL),
                '[]'
              ) AS departments
       FROM team_members tm
       LEFT JOIN member_channels mc    ON mc.team_member_id = tm.id
       LEFT JOIN member_departments md ON md.team_member_id = tm.id
       LEFT JOIN departments d         ON d.id = md.department_id
       GROUP BY tm.id ORDER BY tm.full_name`
    );
    res.json({ success: true, team: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

// POST /api/team — create member (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { full_name, email, password, role='agent', channels=[], department_ids=[] } = req.body;
    if (!full_name?.trim() || !email?.trim() || !password) return res.status(400).json({ success: false, error: 'full_name, email and password are required' });
    if (password.length < 10) return res.status(400).json({ success: false, error: 'Password must be at least 10 characters' });
    if (!['admin','agent','viewer'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
    const { rows } = await query(
      `INSERT INTO team_members (full_name, email, password_hash, role, must_change_password) VALUES ($1,$2,$3,$4,TRUE) RETURNING id, uuid, full_name, email, role, is_active`,
      [full_name.trim(), email.toLowerCase().trim(), hash, role]
    );
    const member = rows[0];

    if (channels.length) {
      const chVals = channels.map(p => `(${member.id},'${p}',${req.user.id})`).join(',');
      await query(`INSERT INTO member_channels (team_member_id, platform, granted_by) VALUES ${chVals} ON CONFLICT DO NOTHING`);
    }
    if (department_ids.length) {
      const dVals = department_ids.map(d => `(${member.id},${d},${req.user.id})`).join(',');
      await query(`INSERT INTO member_departments (team_member_id, department_id, granted_by) VALUES ${dVals} ON CONFLICT DO NOTHING`);
    }
    await logAction(req, 'member_created', { full_name, role, email });
    res.status(201).json({ success: true, member });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Email already exists' });
    logger.error('POST /team', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to create team member' });
  }
});

// PATCH /api/team/:id
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const { full_name, role, is_active, channels, department_ids } = req.body;
    const updates = []; const vals = []; let i = 1;
    if (full_name  !== undefined) { updates.push(`full_name = $${i++}`); vals.push(full_name); }
    if (role       !== undefined) { updates.push(`role = $${i++}`);      vals.push(role); }
    if (is_active  !== undefined) { updates.push(`is_active = $${i++}`); vals.push(is_active); }

    if (updates.length) {
      vals.push(req.params.id);
      await query(`UPDATE team_members SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}`, vals);
    }
    if (channels !== undefined) {
      await query(`DELETE FROM member_channels WHERE team_member_id = $1`, [req.params.id]);
      if (channels.length) {
        const chVals = channels.map(p => `(${req.params.id},'${p}',${req.user.id})`).join(',');
        await query(`INSERT INTO member_channels (team_member_id, platform, granted_by) VALUES ${chVals} ON CONFLICT DO NOTHING`);
      }
    }
    if (department_ids !== undefined) {
      await query(`DELETE FROM member_departments WHERE team_member_id = $1`, [req.params.id]);
      if (department_ids.length) {
        const dVals = department_ids.map(d => `(${req.params.id},${d},${req.user.id})`).join(',');
        await query(`INSERT INTO member_departments (team_member_id, department_id, granted_by) VALUES ${dVals} ON CONFLICT DO NOTHING`);
      }
    }
    await logAction(req, 'member_updated', req.body);
    res.json({ success: true, message: 'Member updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update member' });
  }
});

module.exports = router;
