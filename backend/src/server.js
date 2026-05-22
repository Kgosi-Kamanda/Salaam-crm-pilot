// =============================================================
// server.js — Salaam Microfinance Bank Social CRM API v3
// salaammfbank.co.ke | +254710544444 | +254718373737
// Securing the future together
// =============================================================
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression= require('compression');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { logger } = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Trust proxy (Nginx) ───────────────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-ID'],
}));

// ── Compression & body parsing ────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── HTTP logging ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// ── Request ID ────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = require('uuid').v4();
  next();
});

// ── Global rate limits ────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:       parseInt(process.env.RATE_LIMIT_MAX)       || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  skip: req => req.path.startsWith('/api/webhooks/'),
}));

// Strict limit on auth endpoints
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
}));

// ── Health check (no auth) ────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Salaam CRM API', version: '3.0.0' }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',               require('./routes/auth'));
app.use('/api/contacts',           require('./routes/contacts'));
app.use('/api/conversations',      require('./routes/conversations'));
app.use('/api/messages',           require('./routes/messages'));
app.use('/api/dashboard',          require('./routes/dashboard'));
app.use('/api/team',               require('./routes/team'));
app.use('/api/team/departments',   require('./routes/departments'));
app.use('/api/tags',               require('./routes/tags'));
app.use('/api/canned',             require('./routes/canned'));
app.use('/api/audit',              require('./routes/audit'));
app.use('/api/broadcasts',         require('./routes/broadcasts'));
app.use('/api/webhooks',           require('./webhooks/index'));

// TEMPORARY SETUP ROUTE — REMOVE AFTER USE
app.get('/setup-admin', async (req, res) => {
  const bcrypt = require('bcrypt');
  const { pool } = require('./utils/db');
  try {
    const hash = await bcrypt.hash('Salaam2026!', 12);
    await pool.query(`
      DELETE FROM member_channels WHERE team_member_id = (SELECT id FROM team_members WHERE email = 'dukekmnd@gmail.com');
      DELETE FROM member_departments WHERE team_member_id = (SELECT id FROM team_members WHERE email = 'dukekmnd@gmail.com');
      DELETE FROM team_members WHERE email = 'dukekmnd@gmail.com';
    `);
    const result = await pool.query(
      `INSERT INTO team_members (full_name, email, password_hash, role, is_active, must_change_password)
       VALUES ($1, $2, $3, 'admin', TRUE, FALSE) RETURNING id`,
      ['Kgosi Kamanda', 'dukekmnd@gmail.com', hash]
    );
    const id = result.rows[0].id;
    await pool.query(`
      INSERT INTO member_channels (team_member_id, platform)
      SELECT $1, unnest(ARRAY['facebook','instagram','whatsapp','twitter','tiktok','email','salaampay','webform'])
    `, [id]);
    await pool.query(`
      INSERT INTO member_departments (team_member_id, department_id)
      SELECT $1, id FROM departments
    `, [id]);
    res.json({ success: true, message: 'Admin created. Email: dukekmnd@gmail.com | Password: Salaam2026!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// END TEMPORARY SETUP ROUTE

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({ requestId: req.id, error: err.message, stack: err.stack });
  if (err.message?.includes('CORS')) return res.status(403).json({ success: false, error: 'CORS error' });
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => logger.info(`Salaam CRM API v3 running on port ${PORT} [${process.env.NODE_ENV}]`));

module.exports = app;
