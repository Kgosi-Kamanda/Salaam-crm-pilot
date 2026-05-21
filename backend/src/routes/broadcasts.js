// src/routes/broadcasts.js
// WhatsApp Broadcast Messaging — requires approved Meta templates
// Contacts must have opted_in_whatsapp = TRUE for marketing messages
const express = require('express');
const axios   = require('axios');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const { sanitizeMiddleware } = require('../utils/sanitize');
const { auth, adminOnly, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(auth, sanitizeMiddleware);

// ── Templates ─────────────────────────────────────────────────

// GET /api/broadcasts/templates
router.get('/templates', async (_req, res) => {
  const { rows } = await query(`SELECT * FROM broadcast_templates WHERE is_active = TRUE ORDER BY name`);
  res.json({ success: true, templates: rows });
});

// POST /api/broadcasts/templates — create template (admin only)
router.post('/templates', adminOnly, async (req, res) => {
  try {
    const { name, category, language='en', body_text, header_text, footer_text, variables=[], meta_template_name, requires_opt_in=true } = req.body;
    if (!name?.trim() || !body_text?.trim() || !category) return res.status(400).json({ success: false, error: 'name, category and body_text required' });
    if (!['marketing','utility','transactional','authentication'].includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    const { rows } = await query(
      `INSERT INTO broadcast_templates (name, category, language, body_text, header_text, footer_text, variables, meta_template_name, requires_opt_in, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name.trim(), category, language, body_text.trim(), header_text||null, footer_text||null, JSON.stringify(variables), meta_template_name||null, requires_opt_in, req.user.id]
    );
    await logAction(req, 'broadcast_template_created', { name, category });
    res.status(201).json({ success: true, template: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Template name already exists' });
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// PATCH /api/broadcasts/templates/:id/approval — update Meta approval status
router.patch('/templates/:id/approval', adminOnly, async (req, res) => {
  const { approval_status, meta_approved_at } = req.body;
  if (!['pending','approved','rejected'].includes(approval_status)) return res.status(400).json({ success: false, error: 'Invalid status' });
  const { rows } = await query(`UPDATE broadcast_templates SET approval_status=$1, meta_approved_at=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [approval_status, meta_approved_at||null, req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Template not found' });
  res.json({ success: true, template: rows[0] });
});

// ── Broadcasts ────────────────────────────────────────────────

// GET /api/broadcasts
router.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT b.*, bt.name AS template_name, bt.category, tm.full_name AS created_by_name
     FROM broadcasts b
     JOIN broadcast_templates bt ON bt.id = b.template_id
     LEFT JOIN team_members tm ON tm.id = b.created_by
     ORDER BY b.created_at DESC LIMIT 100`
  );
  res.json({ success: true, broadcasts: rows });
});

// GET /api/broadcasts/:id/stats
router.get('/:id/stats', async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, bt.name AS template_name, bt.body_text,
       COUNT(br.id) AS total,
       COUNT(br.id) FILTER (WHERE br.status='sent')      AS sent,
       COUNT(br.id) FILTER (WHERE br.status='delivered') AS delivered,
       COUNT(br.id) FILTER (WHERE br.status='read')      AS read,
       COUNT(br.id) FILTER (WHERE br.status='failed')    AS failed,
       COUNT(br.id) FILTER (WHERE br.status='opted_out') AS opted_out
     FROM broadcasts b
     JOIN broadcast_templates bt ON bt.id = b.template_id
     LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
     WHERE b.id = $1 GROUP BY b.id, bt.name, bt.body_text`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, error: 'Broadcast not found' });
  res.json({ success: true, broadcast: rows[0] });
});

// POST /api/broadcasts — create broadcast (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { template_id, name, audience_filter={}, scheduled_at } = req.body;
    if (!template_id || !name?.trim()) return res.status(400).json({ success: false, error: 'template_id and name required' });

    // Verify template is approved
    const tRes = await query(`SELECT * FROM broadcast_templates WHERE id = $1 AND is_active = TRUE`, [template_id]);
    if (!tRes.rows.length) return res.status(404).json({ success: false, error: 'Template not found' });
    const tmpl = tRes.rows[0];
    if (tmpl.approval_status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Template must be approved by Meta before use' });
    }

    // Build audience — only opted-in contacts
    const audienceFilter = ['opted_in_whatsapp = TRUE', 'phone IS NOT NULL', 'is_blacklisted = FALSE'];
    const filterParams  = [];
    if (audience_filter.status) {
      filterParams.push(audience_filter.status);
      audienceFilter.push(`status = $${filterParams.length}`);
    }
    if (audience_filter.department) {
      filterParams.push(audience_filter.department);
      audienceFilter.push(`department = $${filterParams.length}`);
    }
    if (audience_filter.branch) {
      filterParams.push(audience_filter.branch);
      audienceFilter.push(`branch = $${filterParams.length}`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM contacts WHERE ${audienceFilter.join(' AND ')}`, filterParams);
    const audienceCount = parseInt(countRes.rows[0].count);

    const { rows } = await query(
      `INSERT INTO broadcasts (template_id, name, audience_filter, audience_count, scheduled_at, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [template_id, name.trim(), JSON.stringify(audience_filter), audienceCount, scheduled_at||null, req.user.id, scheduled_at?'scheduled':'draft']
    );
    await logAction(req, 'broadcast_created', { name, template_id, audience_count: audienceCount });
    res.status(201).json({ success: true, broadcast: rows[0], audience_count: audienceCount });
  } catch (err) {
    logger.error('POST /broadcasts', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to create broadcast' });
  }
});

// POST /api/broadcasts/:id/send — trigger send (admin only)
router.post('/:id/send', adminOnly, async (req, res) => {
  try {
    const bRes = await query(
      `SELECT b.*, bt.body_text, bt.meta_template_name, bt.variables, bt.requires_opt_in
       FROM broadcasts b JOIN broadcast_templates bt ON bt.id = b.template_id WHERE b.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows.length) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    const broadcast = bRes.rows[0];

    if (!['draft','scheduled'].includes(broadcast.status)) {
      return res.status(400).json({ success: false, error: `Cannot send a broadcast with status: ${broadcast.status}` });
    }
    if (!broadcast.meta_template_name) {
      return res.status(400).json({ success: false, error: 'Template must have a Meta template name set before sending' });
    }
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
      return res.status(503).json({ success: false, error: 'WhatsApp API not configured. Contact IT.' });
    }

    // Build audience
    const filter = broadcast.audience_filter || {};
    const audienceFilter = ['opted_in_whatsapp = TRUE', 'phone IS NOT NULL', 'is_blacklisted = FALSE'];
    const filterParams = [];
    if (filter.status)     { filterParams.push(filter.status);     audienceFilter.push(`status = $${filterParams.length}`); }
    if (filter.department) { filterParams.push(filter.department); audienceFilter.push(`department = $${filterParams.length}`); }
    if (filter.branch)     { filterParams.push(filter.branch);     audienceFilter.push(`branch = $${filterParams.length}`); }

    const contacts = await query(`SELECT id, full_name, phone, email FROM contacts WHERE ${audienceFilter.join(' AND ')}`, filterParams);

    // Mark as sending
    await query(`UPDATE broadcasts SET status='sending', sent_at=NOW(), audience_count=$1 WHERE id=$2`, [contacts.rows.length, broadcast.id]);

    // Insert recipients
    for (const c of contacts.rows) {
      await query(
        `INSERT INTO broadcast_recipients (broadcast_id, contact_id, phone) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [broadcast.id, c.id, c.phone]
      );
    }

    // Send async — fire and track
    let sentCount = 0, failedCount = 0;
    for (const c of contacts.rows) {
      try {
        const waRes = await axios.post(
          `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: c.phone.replace(/\D/g, ''),
            type: 'template',
            template: {
              name: broadcast.meta_template_name,
              language: { code: 'en' },
              components: [],
            },
          },
          { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        await query(
          `UPDATE broadcast_recipients SET status='sent', wa_message_id=$1, sent_at=NOW() WHERE broadcast_id=$2 AND contact_id=$3`,
          [waRes.data?.messages?.[0]?.id || null, broadcast.id, c.id]
        );
        sentCount++;
      } catch (sendErr) {
        await query(
          `UPDATE broadcast_recipients SET status='failed', failed_reason=$1 WHERE broadcast_id=$2 AND contact_id=$3`,
          [sendErr.message?.slice(0,200), broadcast.id, c.id]
        );
        failedCount++;
        logger.warn('Broadcast send failure', { contact: c.id, error: sendErr.message });
      }
    }

    await query(`UPDATE broadcasts SET status='sent', sent_count=$1, failed_count=$2, updated_at=NOW() WHERE id=$3`, [sentCount, failedCount, broadcast.id]);
    await logAction(req, 'broadcast_sent', { broadcast_id: broadcast.id, sent: sentCount, failed: failedCount });

    res.json({ success: true, message: `Broadcast sent. ${sentCount} sent, ${failedCount} failed.`, sent_count: sentCount, failed_count: failedCount });
  } catch (err) {
    await query(`UPDATE broadcasts SET status='failed' WHERE id=$1`, [req.params.id]);
    logger.error('POST /broadcasts/:id/send', { error: err.message });
    res.status(500).json({ success: false, error: 'Broadcast failed: ' + err.message });
  }
});

// PATCH /api/broadcasts/:id/cancel
router.patch('/:id/cancel', adminOnly, async (req, res) => {
  const { reason } = req.body;
  const { rows } = await query(
    `UPDATE broadcasts SET status='cancelled', cancelled_by=$1, cancel_reason=$2, updated_at=NOW() WHERE id=$3 AND status IN ('draft','scheduled') RETURNING id`,
    [req.user.id, reason||null, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ success: false, error: 'Cannot cancel — broadcast already sent or not found' });
  await logAction(req, 'broadcast_cancelled', { reason });
  res.json({ success: true, message: 'Broadcast cancelled' });
});

// POST /api/broadcasts/opt-in — record customer opt-in
router.post('/opt-in', auth, async (req, res) => {
  const { contact_id, channel='whatsapp', source='agent_recorded' } = req.body;
  if (!contact_id) return res.status(400).json({ success: false, error: 'contact_id required' });
  const field = channel === 'whatsapp' ? 'opted_in_whatsapp' : 'opted_in_email';
  await query(`UPDATE contacts SET ${field}=TRUE, opted_in_at=NOW(), opt_in_source=$1 WHERE id=$2`, [source, contact_id]);
  await logAction(req, 'opt_in_recorded', { contact_id, channel, source }, contact_id);
  res.json({ success: true, message: 'Opt-in recorded' });
});

// POST /api/broadcasts/opt-out — handle opt-out
router.post('/opt-out', async (req, res) => {
  const { phone, channel='whatsapp' } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'phone required' });
  const field = channel === 'whatsapp' ? 'opted_in_whatsapp' : 'opted_in_email';
  await query(`UPDATE contacts SET ${field}=FALSE WHERE phone=$1`, [phone]);
  // Mark any pending broadcast recipients as opted_out
  await query(
    `UPDATE broadcast_recipients SET status='opted_out' WHERE phone=$1 AND status='pending'`,
    [phone]
  );
  await query(`INSERT INTO activity_log (action, details) VALUES ('opt_out_received', $1)`,
    [JSON.stringify({ phone, channel })]);
  res.json({ success: true, message: 'Opt-out recorded. You will no longer receive messages.' });
});

module.exports = router;
