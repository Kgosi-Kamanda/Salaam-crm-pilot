const express = require('express');
const { query } = require('../utils/db');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT * FROM departments ORDER BY name`);
  res.json({ success: true, departments: rows });
});
router.post('/', adminOnly, async (req, res) => {
  const { name, description, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name required' });
  try {
    const { rows } = await query(`INSERT INTO departments (name, description, color) VALUES ($1,$2,$3) RETURNING *`, [name.trim(), description||null, color||'#144A9A']);
    res.status(201).json({ success: true, department: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Department already exists' });
    res.status(500).json({ success: false, error: 'Failed to create' });
  }
});
router.patch('/:id', adminOnly, async (req, res) => {
  const { name, description, color } = req.body;
  const { rows } = await query(`UPDATE departments SET name=COALESCE($1,name), description=COALESCE($2,description), color=COALESCE($3,color) WHERE id=$4 RETURNING *`, [name||null, description||null, color||null, req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, department: rows[0] });
});
module.exports = router;
