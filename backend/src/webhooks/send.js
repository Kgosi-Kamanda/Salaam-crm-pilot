// src/webhooks/send.js — outbound reply dispatcher
// Routes outbound messages to the correct platform API
const axios  = require('axios');
const { logger } = require('../utils/logger');

const sendReply = async (conversation, body, mediaUrls = []) => {
  const platform = conversation.source_platform;
  const meta     = conversation.channel_metadata || {};

  switch (platform) {

    case 'whatsapp': {
      if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp API not configured');
      }
      await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to:    meta.from || meta.phone,
          type:  'text',
          text:  { preview_url: false, body },
        },
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      break;
    }

    case 'facebook': {
      if (!process.env.META_PAGE_ACCESS_TOKEN) throw new Error('Facebook API not configured');
      await axios.post(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`,
        { recipient: { id: meta.sender_id }, message: { text: body } }
      );
      break;
    }

    case 'instagram': {
      if (!process.env.META_PAGE_ACCESS_TOKEN) throw new Error('Instagram API not configured');
      await axios.post(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`,
        { recipient: { id: meta.sender_id }, message: { text: body } }
      );
      break;
    }

    case 'twitter': {
      if (!process.env.TWITTER_BEARER_TOKEN) throw new Error('Twitter/X API not configured');
      await axios.post(
        'https://api.twitter.com/2/dm_conversations',
        { participant_id: meta.sender_id, text: body },
        { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
      );
      break;
    }

    case 'email': {
      const { sendCsat } = require('../services/email');
      // For email channel, use nodemailer to send reply
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from:    `"Salaam Microfinance Bank" <${process.env.FROM_EMAIL}>`,
        to:      meta.from,
        subject: `Re: ${conversation.subject || 'Your enquiry'}`,
        text:    body,
        html:    `<div style="font-family:Helvetica Neue,Arial,sans-serif;line-height:1.7;">${body.replace(/\n/g,'<br>')}<br><br><hr/><small>Salaam Microfinance Bank &bull; salaammfbank.co.ke &bull; +254710544444 &bull; Securing the future together</small></div>`,
      });
      break;
    }

    case 'tiktok':
      // TikTok comment replies via API — log for now, manual reply still needed
      logger.info('TikTok reply queued (manual action required)', { conv_id: conversation.id });
      break;

    case 'salaampay':
    case 'webform':
      // These channels don't have outbound APIs — agent follows up by phone/email
      logger.info(`${platform} reply noted — follow up via phone/email`, { conv_id: conversation.id });
      break;

    default:
      logger.warn('Unknown platform for reply', { platform, conv_id: conversation.id });
  }
};

module.exports = { sendReply };
