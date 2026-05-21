const express = require('express');
const { query } = require('../utils/db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const { category } = req.query;
  const where = category ? `WHERE category = $1` : '';
  const params = category ? [category] : [];
  const { rows } = await query(`SELECT * FROM tags ${where} ORDER BY category, name`, params);
  res.json({ success: true, tags: rows });
});
router.post('/', adminOnly, async (req, res) => {
  const { name, category, color, sets_priority } = req.body;
  if (!name?.trim() || !category?.trim()) return res.status(400).json({ success: false, error: 'Name and category required' });
  try {
    const { rows } = await query(`INSERT INTO tags (name, category, color, sets_priority) VALUES ($1,$2,$3,$4) RETURNING *`, [name.trim(), category.trim(), color||'#144A9A', sets_priority||null]);
    res.status(201).json({ success: true, tag: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Tag already exists' });
    res.status(500).json({ success: false, error: 'Failed to create tag' });
  }
});
module.exports = router;
