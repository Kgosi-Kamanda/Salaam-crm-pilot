// src/routes/conversations.js
const express = require('express');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, agentOrAdmin, logAction } = require('../middleware/auth');
const { sendCsat } = require('../services/email');

const router = express.Router();
router.use(auth, sanitizeMiddleware);

// GET /api/conversations
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=50, status, priority, source, assigned_to, department_id, search } = req.query;
    const offset = (parseInt(page)-1) * Math.min(parseInt(limit),100);
    const params = []; const conds = [];

    if (status)       { params.push(status);       conds.push(`v.status = $${params.length}`); }
    if (priority)     { params.push(priority);     conds.push(`v.priority = $${params.length}`); }
    if (source)       { params.push(source);       conds.push(`v.source = $${params.length}`); }
    if (assigned_to)  { params.push(assigned_to);  conds.push(`v.assigned_to = $${params.length}`); }
    if (department_id){ params.push(department_id);conds.push(`v.department_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(v.contact_name ILIKE $${params.length} OR v.latest_message ILIKE $${params.length})`);
    }

    // Agents only see their allowed channels
    if (req.user.role !== 'admin') {
      const chRes = await query(`SELECT platform FROM member_channels WHERE team_member_id = $1`, [req.user.id]);
      const platforms = chRes.rows.map(r => r.platform);
      if (platforms.length) { params.push(platforms); conds.push(`v.source = ANY($${params.length})`); }
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(Math.min(parseInt(limit),100)); params.push(offset);

    const [dataRes, countRes] = await Promise.all([
      query(`SELECT * FROM v_inbox ${where} ORDER BY last_message_at DESC NULLS LAST LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      query(`SELECT COUNT(*) FROM v_inbox ${where}`, params.slice(0,-2)),
    ]);
    res.json({ success: true, conversations: dataRes.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    logger.error('GET /conversations', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM v_inbox WHERE conversation_id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, conversation: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// PATCH /api/conversations/:id — update status, priority, assignment, etc.
router.patch('/:id', agentOrAdmin, async (req, res) => {
  const allowed = ['status','priority','assigned_to','department_id','subject','is_spam','spam_reason'];
  try {
    const updates = []; const vals = []; let i = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { updates.push(`${k} = $${i++}`); vals.push(v); }
    }
    if (req.body.status === 'resolved') {
      updates.push(`resolved_at = $${i++}`, `resolved_by = $${i++}`);
      vals.push(new Date(), req.user.id);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await query(
      `UPDATE conversations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const conv = rows[0];

    // Log action
    const action = req.body.status === 'resolved' ? 'conversation_resolved' :
                   req.body.assigned_to ? 'conversation_assigned' :
                   req.body.priority    ? 'priority_changed'       : 'conversation_updated';
    await logAction(req, action, req.body, conv.contact_id, conv.id);

    // Send CSAT on resolve
    if (req.body.status === 'resolved' && conv.contact_id) {
      const cRes = await query(`SELECT full_name, email FROM contacts WHERE id = $1`, [conv.contact_id]);
      if (cRes.rows[0]?.email) {
        sendCsat(cRes.rows[0], conv.id).catch(e => logger.warn('CSAT send failed', { error: e.message }));
        await query(`UPDATE conversations SET csat_sent_at = NOW() WHERE id = $1`, [conv.id]);
      }
    }
    res.json({ success: true, conversation: conv });
  } catch (err) {
    logger.error('PATCH /conversations/:id', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

// POST /api/conversations/:id/tags
router.post('/:id/tags', agentOrAdmin, async (req, res) => {
  try {
    const { tag_id } = req.body;
    if (!tag_id) return res.status(400).json({ success: false, error: 'tag_id required' });
    await query(
      `INSERT INTO conversation_tags (conversation_id, tag_id, added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, tag_id, req.user.id]
    );
    // Auto-update priority from tag
    const tagRes = await query(`SELECT sets_priority FROM tags WHERE id = $1 AND sets_priority IS NOT NULL`, [tag_id]);
    if (tagRes.rows[0]?.sets_priority) {
      await query(`UPDATE conversations SET priority = $1 WHERE id = $2 AND priority NOT IN ('urgent','high')`, [tagRes.rows[0].sets_priority, req.params.id]);
    }
    const convRes = await query(`SELECT contact_id FROM conversations WHERE id = $1`, [req.params.id]);
    await logAction(req, 'tag_added', { tag_id }, convRes.rows[0]?.contact_id, parseInt(req.params.id));
    res.json({ success: true, message: 'Tag added' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add tag' });
  }
});

// DELETE /api/conversations/:id/tags/:tagId
router.delete('/:id/tags/:tagId', agentOrAdmin, async (req, res) => {
  try {
    await query(`DELETE FROM conversation_tags WHERE conversation_id = $1 AND tag_id = $2`, [req.params.id, req.params.tagId]);
    res.json({ success: true, message: 'Tag removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove tag' });
  }
});

// POST /api/conversations/:id/csat — record CSAT from email link
router.post('/:id/csat', async (req, res) => {
  try {
    const { score, comment, token } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, error: 'Score must be 1-5' });
    // Basic HMAC token validation (token = hmac of conv_id + secret)
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(req.params.id)).digest('hex').slice(0,16);
    if (token !== expected) return res.status(403).json({ success: false, error: 'Invalid CSAT token' });
    await query(
      `UPDATE conversations SET csat_score = $1, csat_comment = $2, csat_received_at = NOW() WHERE id = $3`,
      [score, comment||null, req.params.id]
    );
    await query(`INSERT INTO activity_log (conversation_id, action, details) VALUES ($1, 'csat_received', $2)`,
      [req.params.id, JSON.stringify({ score, comment })]);
    res.json({ success: true, message: 'Thank you for your feedback. JazakAllah Khayr!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record CSAT' });
  }
});

module.exports = router;
