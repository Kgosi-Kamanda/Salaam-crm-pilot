const xss = require('xss');
const opts = { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] };

const sanitize = val => typeof val === 'string' ? xss(val.trim(), opts) : val;

const sanitizeBody = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return out;
};

// Express middleware — sanitizes req.body in-place
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = sanitizeBody(req.body);
  next();
};

module.exports = { sanitize, sanitizeBody, sanitizeMiddleware };
