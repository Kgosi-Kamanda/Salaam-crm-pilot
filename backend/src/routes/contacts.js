// src/routes/contacts.js
const express = require('express');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, adminOnly, agentOrAdmin, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(auth, sanitizeMiddleware);

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, source, department } = req.query;
    const offset = (parseInt(page) - 1) * Math.min(parseInt(limit), 100);
    const params = []; const conds = [];

    if (search) {
      params.push(`%${search}%`);
      conds.push(`(c.full_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.salaampay_account ILIKE $${params.length})`);
    }
    if (status)     { params.push(status);     conds.push(`c.status = $${params.length}`); }
    if (source)     { params.push(source);     conds.push(`c.primary_source = $${params.length}`); }
    if (department) { params.push(department); conds.push(`c.department = $${params.length}`); }
    if (req.user.role !== 'admin') {
      // Agents only see contacts in their departments
      const deptRes = await query(`SELECT d.name FROM member_departments md JOIN departments d ON d.id = md.department_id WHERE md.team_member_id = $1`, [req.user.id]);
      const deptNames = deptRes.rows.map(r => r.name);
      if (deptNames.length) {
        params.push(deptNames);
        conds.push(`c.department = ANY($${params.length})`);
      }
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(Math.min(parseInt(limit), 100)); params.push(offset);

    const [dataRes, countRes] = await Promise.all([
      query(`SELECT c.id, c.uuid, c.full_name, c.email, c.phone, c.salaampay_account, c.primary_source, c.department, c.status, c.branch, c.opted_in_whatsapp, c.opted_in_email, c.created_at, c.updated_at FROM contacts c ${where} ORDER BY c.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      query(`SELECT COUNT(*) FROM contacts c ${where}`, params.slice(0, -2)),
    ]);
    res.json({ success: true, contacts: dataRes.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error('GET /contacts', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM contacts WHERE id = $1 OR uuid = $1::text`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contact not found' });
    const convs = await query(`SELECT id, uuid, source_platform, status, priority, created_at, updated_at FROM conversations WHERE contact_id = $1 ORDER BY updated_at DESC LIMIT 20`, [rows[0].id]);
    res.json({ success: true, contact: rows[0], conversations: convs.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts
router.post('/', agentOrAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, salaampay_account, primary_source, department, status, notes, branch, opted_in_whatsapp, opted_in_email } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ success: false, error: 'full_name is required' });
    const { rows } = await query(
      `INSERT INTO contacts (full_name, email, phone, salaampay_account, primary_source, department, status, notes, branch, opted_in_whatsapp, opted_in_email, opted_in_at, opt_in_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [full_name, email||null, phone||null, salaampay_account||null, primary_source||null, department||null, status||'new', notes||null, branch||null,
       opted_in_whatsapp||false, opted_in_email||false,
       (opted_in_whatsapp||opted_in_email)?new Date():null,
       (opted_in_whatsapp||opted_in_email)?'manual_entry':null]
    );
    await logAction(req, 'contact_created', { full_name, source: primary_source }, rows[0].id);
    res.status(201).json({ success: true, contact: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Contact with this email or phone already exists' });
    res.status(500).json({ success: false, error: 'Failed to create contact' });
  }
});

// PATCH /api/contacts/:id
router.patch('/:id', agentOrAdmin, async (req, res) => {
  try {
    const allowed = ['full_name','email','phone','salaampay_account','primary_source','department','status','notes','branch','opted_in_whatsapp','opted_in_email'];
    const updates = []; const vals = []; let i = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { updates.push(`${k} = $${i++}`); vals.push(v); }
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE contacts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} OR uuid = $${i}::text RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contact not found' });
    await logAction(req, 'contact_updated', req.body, rows[0].id);
    res.json({ success: true, contact: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id — admin only, soft delete (blacklist)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await query(
      `UPDATE contacts SET is_blacklisted = TRUE, blacklist_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name`,
      [reason || 'Removed by admin', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contact not found' });
    await logAction(req, 'contact_blacklisted', { reason }, rows[0].id);
    res.json({ success: true, message: 'Contact blacklisted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove contact' });
  }
});

module.exports = router;
