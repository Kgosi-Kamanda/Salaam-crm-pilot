const { Pool } = require('pg');
const { logger } = require('./logger');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
pool.on('error', err => logger.error('DB pool error', { error: err.message }));
const query = (text, params) => pool.query(text, params);
module.exports = { pool, query };
