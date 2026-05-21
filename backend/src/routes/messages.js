// src/routes/messages.js
const express = require('express');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, agentOrAdmin, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(auth, sanitizeMiddleware);

// GET /api/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { page=1, limit=100 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    const { rows } = await query(
      `SELECT m.id, m.uuid, m.direction, m.body, m.media_urls, m.is_internal_note,
              m.delivery_status, m.sent_at, m.delivered_at, m.read_at,
              tm.full_name AS sent_by_name, tm.role AS sent_by_role
       FROM messages m
       LEFT JOIN team_members tm ON tm.id = m.sent_by
       WHERE m.conversation_id = $1 AND m.is_deleted = FALSE
       ORDER BY m.sent_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, parseInt(limit), offset]
    );
    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:id/messages — send or add internal note
router.post('/conversations/:id/messages', agentOrAdmin, async (req, res) => {
  try {
    const { body, is_internal_note = false, media_urls = [] } = req.body;
    if (!body?.trim() && !media_urls.length) return res.status(400).json({ success: false, error: 'Message body or media required' });

    const convRes = await query(`SELECT * FROM conversations WHERE id = $1`, [req.params.id]);
    if (!convRes.rows.length) return res.status(404).json({ success: false, error: 'Conversation not found' });
    const conv = convRes.rows[0];

    // Insert message
    const { rows } = await query(
      `INSERT INTO messages (conversation_id, direction, body, media_urls, is_internal_note, sent_by)
       VALUES ($1, 'outbound', $2, $3, $4, $5) RETURNING *`,
      [req.params.id, body||null, JSON.stringify(media_urls), is_internal_note, req.user.id]
    );
    const msg = rows[0];

    // Mark first response time
    if (!is_internal_note && !conv.first_response_at) {
      await query(`UPDATE conversations SET first_response_at = NOW(), updated_at = NOW() WHERE id = $1`, [req.params.id]);
    } else {
      await query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.id]);
    }

    // If not an internal note, attempt platform send (platform handler in webhooks/send.js)
    if (!is_internal_note) {
      try {
        const { sendReply } = require('../webhooks/send');
        await sendReply(conv, body, media_urls);
        await query(`UPDATE messages SET delivery_status = 'sent' WHERE id = $1`, [msg.id]);
      } catch (sendErr) {
        logger.warn('Platform send failed — message saved but not delivered to platform', { error: sendErr.message });
        await query(`UPDATE messages SET delivery_status = 'failed' WHERE id = $1`, [msg.id]);
      }
    }

    await logAction(req, is_internal_note ? 'note_added' : 'message_sent',
      { length: body?.length, platform: conv.source_platform }, conv.contact_id, conv.id);

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    logger.error('POST /messages', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// DELETE /api/messages/:id — soft delete, admin only
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    await query(`UPDATE messages SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 WHERE id = $2`, [req.user.id, req.params.id]);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

module.exports = router;
