// src/middleware/auth.js
// JWT authentication + refresh token rotation + role-based access guard
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');

// ── Verify access token ───────────────────────────────────────
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Verify member still exists and is active
    const { rows } = await query(
      'SELECT id, uuid, full_name, email, role, is_active FROM team_members WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Account not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError')  return res.status(401).json({ success: false, error: 'Invalid token' });
    logger.error('Auth middleware error', { error: err.message });
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// ── Role guard ────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  next();
};

const adminOnly  = requireRole('admin');
const agentOrAdmin = requireRole('agent', 'admin');

// ── Log all authenticated actions ─────────────────────────────
const logAction = async (req, action, details = {}, contactId = null, convId = null) => {
  try {
    await query(
      `INSERT INTO activity_log (team_member_id, contact_id, conversation_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user?.id, contactId, convId, action, JSON.stringify(details),
       req.ip, req.headers['user-agent']?.slice(0, 255)]
    );
  } catch (e) {
    logger.warn('Failed to log action', { action, error: e.message });
  }
};

// ── Generate JWT access token ─────────────────────────────────
const signAccessToken = user => jwt.sign(
  { sub: user.id, uuid: user.uuid, role: user.role, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m', issuer: 'salaam-crm', audience: 'salaam-crm-client' }
);

// ── Generate + store refresh token ───────────────────────────
const issueRefreshToken = async (userId, ip, ua) => {
  const raw   = crypto.randomBytes(64).toString('hex');
  const hash  = crypto.createHash('sha256').update(raw).digest('hex');
  const exp   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (token_hash, team_member_id, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [hash, userId, exp, ip, ua?.slice(0, 255)]
  );
  return raw;
};

// ── Revoke refresh token ──────────────────────────────────────
const revokeRefreshToken = async (raw, reason = 'logout') => {
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  await query(
    `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW(), revoke_reason = $1
     WHERE token_hash = $2`,
    [reason, hash]
  );
};

// ── Validate refresh token ────────────────────────────────────
const validateRefreshToken = async raw => {
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const { rows } = await query(
    `SELECT rt.*, tm.id as user_id, tm.role, tm.email, tm.full_name, tm.uuid, tm.is_active
     FROM refresh_tokens rt
     JOIN team_members tm ON tm.id = rt.team_member_id
     WHERE rt.token_hash = $1 AND rt.is_revoked = FALSE AND rt.expires_at > NOW()`,
    [hash]
  );
  if (!rows.length || !rows[0].is_active) return null;
  return rows[0];
};

module.exports = { auth, requireRole, adminOnly, agentOrAdmin, logAction, signAccessToken, issueRefreshToken, revokeRefreshToken, validateRefreshToken };
