// src/webhooks/index.js — inbound webhooks for all 8 channels
const express   = require('express');
const crypto    = require('crypto');
const { query } = require('../utils/db');
const { logger } = require('../utils/logger');
const router    = express.Router();

// ── Shared helpers ────────────────────────────────────────────
const upsertContact = async (platform, platformUserId, name, phone, email) => {
  const pids = JSON.stringify({ [platform]: platformUserId });
  // Check if contact exists by platform ID
  let res = await query(`SELECT id FROM contacts WHERE platform_ids->>'${platform}' = $1`, [platformUserId]);
  if (res.rows.length) return res.rows[0].id;
  // Check by phone
  if (phone) { res = await query(`SELECT id FROM contacts WHERE phone = $1`, [phone]); if (res.rows.length) {
    await query(`UPDATE contacts SET platform_ids = platform_ids || $1::jsonb WHERE id = $2`, [pids, res.rows[0].id]);
    return res.rows[0].id;
  }}
  // Create new
  const ins = await query(
    `INSERT INTO contacts (full_name, email, phone, platform_ids, primary_source) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [name||`${platform} user`, email||null, phone||null, pids, platform]
  );
  return ins.rows[0].id;
};

const upsertConversation = async (contactId, platform, externalThreadId, priority='normal') => {
  const existing = await query(
    `SELECT id FROM conversations WHERE contact_id=$1 AND source_platform=$2 AND external_thread_id=$3 AND status='open'`,
    [contactId, platform, externalThreadId]
  );
  if (existing.rows.length) return existing.rows[0].id;
  const { rows } = await query(
    `INSERT INTO conversations (contact_id, source_platform, external_thread_id, priority) VALUES ($1,$2,$3,$4) RETURNING id`,
    [contactId, platform, externalThreadId, priority]
  );
  return rows[0].id;
};

const saveMessage = async (convId, body, extMsgId, metadata={}) => {
  await query(
    `INSERT INTO messages (conversation_id, direction, body, external_message_id, platform_metadata, delivery_status)
     VALUES ($1,'inbound',$2,$3,$4,'delivered') ON CONFLICT DO NOTHING`,
    [convId, body, extMsgId, JSON.stringify(metadata)]
  );
  await query(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [convId]);
};

// ── Signature verifiers ───────────────────────────────────────
const verifyMeta = (req) => {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig || !process.env.META_APP_SECRET) return false;
  const expected = `sha256=${crypto.createHmac('sha256', process.env.META_APP_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const verifyWhatsApp = (req) => {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig || !process.env.META_APP_SECRET) return false;
  const expected = `sha256=${crypto.createHmac('sha256', process.env.META_APP_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const verifyTwitter = (req) => {
  const sig = req.headers['x-twitter-webhooks-signature'];
  if (!sig || !process.env.TWITTER_CONSUMER_SECRET) return false;
  const expected = `sha256=${crypto.createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET).update(JSON.stringify(req.body)).digest('base64')}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const verifySalaamPay = (req) => {
  const secret = req.headers['x-salaampay-secret'];
  if (!secret || !process.env.SALAAMPAY_API_SECRET) return false;
  return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(process.env.SALAAMPAY_API_SECRET));
};

// ── Facebook / Instagram (Meta) ───────────────────────────────
router.get('/meta', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) return res.send(challenge);
  res.sendStatus(403);
});

router.post('/meta', async (req, res) => {
  if (!verifyMeta(req)) return res.sendStatus(403);
  res.sendStatus(200); // respond immediately
  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      for (const change of (entry.changes || entry.messaging || [])) {
        const isIG = req.body.object === 'instagram';
        const platform = isIG ? 'instagram' : 'facebook';
        const msg = change.message || change.value?.messages?.[0];
        const from = change.sender?.id || change.value?.messages?.[0]?.from;
        if (!msg || !from) continue;
        const body = msg.text || msg.caption || '[Media]';
        const contactId = await upsertContact(platform, from, null, null, null);
        const convId    = await upsertConversation(contactId, platform, entry.id || from);
        await saveMessage(convId, body, msg.mid || msg.id, { platform, raw: change });
      }
    }
  } catch (e) { logger.error('Meta webhook error', { error: e.message }); }
});

// ── WhatsApp Business ─────────────────────────────────────────
router.get('/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.send(challenge);
  res.sendStatus(403);
});

router.post('/whatsapp', async (req, res) => {
  if (!verifyWhatsApp(req)) return res.sendStatus(403);
  res.sendStatus(200);
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes || [];
    for (const change of changes) {
      const messages = change.value?.messages || [];
      for (const msg of messages) {
        const from    = msg.from;
        const body    = msg.text?.body || msg.caption || `[${msg.type}]`;
        const phone   = `+${from}`;
        const profile = change.value?.contacts?.find(c => c.wa_id === from);
        const name    = profile?.profile?.name || null;

        // Handle opt-out keywords
        if (['stop','unsubscribe','opt out'].includes(body.toLowerCase().trim())) {
          await query(`UPDATE contacts SET opted_in_whatsapp=FALSE WHERE phone=$1`, [phone]);
          await query(`UPDATE broadcast_recipients SET status='opted_out' WHERE phone=$1 AND status='pending'`, [phone]);
          logger.info('WhatsApp opt-out', { phone });
          continue;
        }

        const contactId = await upsertContact('whatsapp', from, name, phone, null);
        // Mark as opted in if they message us
        await query(`UPDATE contacts SET opted_in_whatsapp=TRUE, opted_in_at=COALESCE(opted_in_at,NOW()), opt_in_source=COALESCE(opt_in_source,'inbound_message') WHERE id=$1`, [contactId]);
        const convId = await upsertConversation(contactId, 'whatsapp', from);
        await saveMessage(convId, body, msg.id, { type: msg.type, timestamp: msg.timestamp });

        // Update delivery status for broadcast if applicable
        if (msg.id) {
          await query(`UPDATE broadcast_recipients SET status='delivered', delivered_at=NOW() WHERE wa_message_id=$1`, [msg.id]);
        }
      }

      // Handle status updates for broadcasts
      for (const status of (change.value?.statuses || [])) {
        const waId = status.id;
        const s    = status.status; // sent, delivered, read, failed
        if (['delivered','read'].includes(s)) {
          await query(`UPDATE broadcast_recipients SET status=$1, delivered_at=CASE WHEN $1='delivered' THEN NOW() ELSE delivered_at END, read_at=CASE WHEN $1='read' THEN NOW() ELSE read_at END WHERE wa_message_id=$2`, [s, waId]);
        }
      }
    }
  } catch (e) { logger.error('WhatsApp webhook error', { error: e.message }); }
});

// ── Twitter/X ─────────────────────────────────────────────────
router.get('/twitter', (req, res) => {
  const token   = process.env.TWITTER_CONSUMER_SECRET;
  const crcToken = req.query.crc_token;
  if (!crcToken || !token) return res.sendStatus(400);
  res.json({ response_token: `sha256=${crypto.createHmac('sha256',token).update(crcToken).digest('base64')}` });
});

router.post('/twitter', async (req, res) => {
  if (!verifyTwitter(req)) return res.sendStatus(403);
  res.sendStatus(200);
  try {
    for (const evt of (req.body.direct_message_events || [])) {
      if (evt.type !== 'message_create') continue;
      const senderId = evt.message_create?.sender_id;
      const body     = evt.message_create?.message_data?.text;
      if (!senderId || !body) continue;
      const name = req.body.users?.[senderId]?.name || null;
      const contactId = await upsertContact('twitter', senderId, name, null, null);
      const convId    = await upsertConversation(contactId, 'twitter', senderId);
      await saveMessage(convId, body, evt.id, { event_type: 'dm' });
    }
    for (const evt of (req.body.tweet_create_events || [])) {
      const user = evt.user;
      const body = evt.text;
      if (!user || !body) continue;
      const contactId = await upsertContact('twitter', String(user.id), user.name, null, null);
      const convId    = await upsertConversation(contactId, 'twitter', String(evt.id));
      await saveMessage(convId, body, String(evt.id), { type: 'tweet_mention' });
    }
  } catch (e) { logger.error('Twitter webhook error', { error: e.message }); }
});

// ── TikTok ────────────────────────────────────────────────────
router.post('/tiktok', async (req, res) => {
  const sig = req.headers['x-tiktok-signature'];
  if (sig && process.env.TIKTOK_APP_SECRET) {
    const expected = crypto.createHmac('sha256', process.env.TIKTOK_APP_SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.sendStatus(403);
  }
  res.sendStatus(200);
  try {
    for (const comment of (req.body.comments || [])) {
      const userId  = comment.user_id || comment.user?.id;
      const name    = comment.user?.display_name || null;
      const body    = comment.text;
      if (!userId || !body) continue;
      const contactId = await upsertContact('tiktok', String(userId), name, null, null);
      const convId    = await upsertConversation(contactId, 'tiktok', String(comment.video_id || userId));
      await saveMessage(convId, body, String(comment.comment_id), { video_id: comment.video_id });
    }
  } catch (e) { logger.error('TikTok webhook error', { error: e.message }); }
});

// ── Email (Mailgun) ───────────────────────────────────────────
router.post('/email', async (req, res) => {
  res.sendStatus(200);
  try {
    const { sender, from, subject, 'stripped-text': body, 'Message-Id': msgId } = req.body;
    const email    = sender || from;
    const name     = email?.split('@')[0] || null;
    if (!email || !body) return;
    const contactId = await upsertContact('email', email, name, null, email);
    const convId    = await upsertConversation(contactId, 'email', msgId || email, 'normal');
    if (subject) { await query(`UPDATE conversations SET subject=$1 WHERE id=$2`, [subject.slice(0,500), convId]); }
    await saveMessage(convId, body, msgId, { subject, from: email });
  } catch (e) { logger.error('Email webhook error', { error: e.message }); }
});

// ── SalaamPay App ─────────────────────────────────────────────
router.post('/salaampay', async (req, res) => {
  if (!verifySalaamPay(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const { account_number, full_name, email, phone, ticket_type, description, error_code, transaction_ref, amount_ksh, device_model, app_version, os_version } = req.body;
    if (!description?.trim()) return res.status(400).json({ success: false, error: 'description required' });

    const contactId = await upsertContact('salaampay', account_number||email||phone, full_name, phone||null, email||null);
    if (account_number) { await query(`UPDATE contacts SET salaampay_account=$1 WHERE id=$2`, [account_number, contactId]); }

    // Determine priority from ticket type
    const urgentTypes   = ['fraud','account_locked','reversal','failed_transaction','duplicate_charge'];
    const highTypes     = ['pending_transaction','disbursement_delay','withdrawal'];
    const priority      = urgentTypes.some(t => ticket_type?.includes(t)) ? 'urgent' :
                          highTypes.some(t   => ticket_type?.includes(t)) ? 'high'   : 'medium';

    const convId = await upsertConversation(contactId, 'salaampay', `${account_number}-${Date.now()}`, priority);
    await saveMessage(convId, description, null, { ticket_type, error_code, transaction_ref });

    // Create SalaamPay ticket record
    await query(
      `INSERT INTO salaampay_tickets (conversation_id, contact_id, salaampay_account, ticket_type, description, error_code, transaction_ref, amount_ksh, device_model, app_version, os_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [convId, contactId, account_number||null, ticket_type||null, description, error_code||null, transaction_ref||null, amount_ksh||null, device_model||null, app_version||null, os_version||null]
    );

    // Auto-tag based on ticket type
    if (ticket_type) {
      const tagRes = await query(`SELECT id FROM tags WHERE name ILIKE $1 LIMIT 1`, [`%${ticket_type.replace(/_/g,'-')}%`]);
      if (tagRes.rows.length) {
        await query(`INSERT INTO conversation_tags (conversation_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [convId, tagRes.rows[0].id]);
      }
    }

    res.json({ success: true, message: 'Ticket received. Our team will respond shortly.', conversation_id: convId });
  } catch (e) {
    logger.error('SalaamPay webhook error', { error: e.message });
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// ── Web Form ──────────────────────────────────────────────────
router.post('/webform', async (req, res) => {
  try {
    const { full_name, email, phone, issue_type, message, form_name, page_url, utm_source, utm_campaign } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'message is required' });
    if (email && !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ success: false, error: 'Invalid email' });

    // Save lead
    await query(
      `INSERT INTO leads (source_platform, full_name, email, phone, message, form_name, page_url, utm_source, utm_campaign, ip_address)
       VALUES ('webform',$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [full_name||null, email||null, phone||null, message.trim(), form_name||null, page_url||null, utm_source||null, utm_campaign||null, req.ip]
    );

    const contactId = await upsertContact('webform', email||phone||`web-${Date.now()}`, full_name, phone||null, email||null);
    const convId    = await upsertConversation(contactId, 'webform', `webform-${contactId}-${Date.now()}`, 'normal');
    await saveMessage(convId, message.trim(), null, { issue_type, form_name, page_url });
    if (issue_type) {
      const tagRes = await query(`SELECT id FROM tags WHERE name ILIKE $1 LIMIT 1`, [`%${issue_type.replace(/_/g,'-')}%`]);
      if (tagRes.rows.length) await query(`INSERT INTO conversation_tags (conversation_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [convId, tagRes.rows[0].id]);
    }

    res.json({ success: true, message: 'Your request has been received. Our team will be in touch shortly. JazakAllah Khayr!' });
  } catch (e) {
    logger.error('Webform webhook error', { error: e.message });
    res.status(500).json({ success: false, error: 'Submission failed. Please try again or call +254710544444.' });
  }
});

module.exports = router;
