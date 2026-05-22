// src/routes/auth.js
const express  = require('express');
const bcrypt   = require('bcrypt');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const {
  auth, signAccessToken, issueRefreshToken,
  revokeRefreshToken, validateRefreshToken, logAction
} = require('../middleware/auth');

const router = express.Router();
router.use(sanitizeMiddleware);

const MAX_ATTEMPTS  = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_MINS  = parseInt(process.env.LOCKOUT_MINUTES)    || 30;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

  try {
    const { rows } = await query(
      `SELECT id, uuid, full_name, email, password_hash, role, is_active,
              failed_logins, locked_until, must_change_password
       FROM team_members WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    const logAttempt = async (success, reason) => {
      await query(
        `INSERT INTO login_audit (team_member_id, email_attempted, success, ip_address, user_agent, failure_reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rows[0]?.id || null, email.toLowerCase(), success, req.ip, req.headers['user-agent']?.slice(0, 255), reason]
      );
    };

    if (!rows.length) {
      await logAttempt(false, 'user_not_found');
      // Timing-safe: still run bcrypt to prevent user enumeration
      await bcrypt.hash('dummy', 10);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const member = rows[0];

    if (!member.is_active) {
      await logAttempt(false, 'account_inactive');
      return res.status(401).json({ success: false, error: 'Account is inactive. Contact your administrator.' });
    }

    if (member.locked_until && new Date(member.locked_until) > new Date()) {
      await logAttempt(false, 'account_locked');
      return res.status(429).json({ success: false, error: `Account locked until ${new Date(member.locked_until).toISOString()}` });
    }

    // Accept both $2a$ (PostgreSQL) and $2b$ (Node.js bcrypt) hash formats
const normalizedHash = member.password_hash.replace(/^\$2a\$/, '$2b$');
const valid = await bcrypt.compare(password, normalizedHash);

    if (!valid) {
      const newFails = (member.failed_logins || 0) + 1;
      let lockUntil  = null;
      if (newFails >= MAX_ATTEMPTS) {
        lockUntil = new Date(Date.now() + LOCKOUT_MINS * 60 * 1000);
        logger.warn('Account locked', { email: member.email, ip: req.ip });
      }
      await query(
        `UPDATE team_members SET failed_logins = $1, locked_until = $2 WHERE id = $3`,
        [newFails, lockUntil, member.id]
      );
      await logAttempt(false, 'invalid_password');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Reset fail count
    await query(
      `UPDATE team_members SET failed_logins = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`,
      [req.ip, member.id]
    );

    // Fetch member's channels and departments
    const [chResult, deptResult] = await Promise.all([
      query(`SELECT platform FROM member_channels WHERE team_member_id = $1`, [member.id]),
      query(`SELECT d.id, d.name, d.color FROM member_departments md JOIN departments d ON d.id = md.department_id WHERE md.team_member_id = $1`, [member.id]),
    ]);

    const user = {
      id:          member.id,
      uuid:        member.uuid,
      full_name:   member.full_name,
      email:       member.email,
      role:        member.role,
      channels:    chResult.rows.map(r => r.platform),
      departments: deptResult.rows,
      must_change_password: member.must_change_password,
    };

    const accessToken  = signAccessToken(user);
    const refreshToken = await issueRefreshToken(member.id, req.ip, req.headers['user-agent']);

    await logAttempt(true, null);
    await logAction(req, 'login', { ip: req.ip }, null, null);

    res.json({ success: true, token: accessToken, refresh_token: refreshToken, user });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/refresh — get new access token using refresh token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ success: false, error: 'Refresh token required' });
  try {
    const record = await validateRefreshToken(refresh_token);
    if (!record) return res.status(401).json({ success: false, error: 'Invalid or expired refresh token', code: 'REFRESH_INVALID' });

    // Rotate: revoke old, issue new
    await revokeRefreshToken(refresh_token, 'rotated');
    const newRefresh = await issueRefreshToken(record.user_id, req.ip, req.headers['user-agent']);
    const newAccess  = signAccessToken({ id: record.user_id, uuid: record.uuid, role: record.role, email: record.email });

    res.json({ success: true, token: newAccess, refresh_token: newRefresh });
  } catch (err) {
    logger.error('Refresh error', { error: err.message });
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) await revokeRefreshToken(refresh_token, 'logout').catch(() => {});
  await logAction(req, 'logout');
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const [chRes, deptRes] = await Promise.all([
    query(`SELECT platform FROM member_channels WHERE team_member_id = $1`, [req.user.id]),
    query(`SELECT d.id, d.name, d.color FROM member_departments md JOIN departments d ON d.id = md.department_id WHERE md.team_member_id = $1`, [req.user.id]),
  ]);
  res.json({ success: true, user: { ...req.user, channels: chRes.rows.map(r => r.platform), departments: deptRes.rows } });
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ success: false, error: 'Both passwords required' });
  if (new_password.length < 10) return res.status(400).json({ success: false, error: 'New password must be at least 10 characters' });
  if (!/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password) || !/[^A-Za-z0-9]/.test(new_password)) {
    return res.status(400).json({ success: false, error: 'Password must contain an uppercase letter, a number, and a special character' });
  }
  try {
    const { rows } = await query(`SELECT password_hash FROM team_members WHERE id = $1`, [req.user.id]);
    if (!await bcrypt.compare(current_password, rows[0].password_hash)) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query(
      `UPDATE team_members SET password_hash = $1, password_changed_at = NOW(), must_change_password = FALSE WHERE id = $2`,
      [hash, req.user.id]
    );
    await logAction(req, 'password_changed');
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Change password error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

module.exports = router;
