const express = require('express');
const { query } = require('../utils/db');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, agentOrAdmin, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.use(auth, sanitizeMiddleware);

router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const params = [req.user.id]; const conds = [`(cr.is_shared = TRUE OR cr.created_by = $1)`, `cr.is_active = TRUE`];
  if (category) { params.push(category); conds.push(`cr.category = $${params.length}`); }
  if (search)   { params.push(`%${search}%`); conds.push(`(cr.title ILIKE $${params.length} OR cr.body ILIKE $${params.length} OR cr.shortcut ILIKE $${params.length})`); }
  const { rows } = await query(`SELECT * FROM canned_responses cr WHERE ${conds.join(' AND ')} ORDER BY use_count DESC, title ASC`, params);
  res.json({ success: true, canned_responses: rows });
});
router.post('/', agentOrAdmin, async (req, res) => {
  const { title, shortcut, body, category, is_shared=true } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ success: false, error: 'Title and body required' });
  const { rows } = await query(`INSERT INTO canned_responses (title, shortcut, body, category, is_shared, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [title.trim(), shortcut||null, body.trim(), category||null, is_shared, req.user.id]);
  res.status(201).json({ success: true, canned_response: rows[0] });
});
router.post('/:id/use', agentOrAdmin, async (_req, res) => {
  const id = _req.params.id;
  await query(`UPDATE canned_responses SET use_count = use_count + 1 WHERE id = $1`, [id]);
  res.json({ success: true });
});
router.delete('/:id', async (req, res) => {
  const { rows } = await query(`SELECT created_by FROM canned_responses WHERE id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
  if (req.user.role !== 'admin' && rows[0].created_by !== req.user.id) return res.status(403).json({ success: false, error: 'Not allowed' });
  await query(`UPDATE canned_responses SET is_active = FALSE WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});
module.exports = router;
