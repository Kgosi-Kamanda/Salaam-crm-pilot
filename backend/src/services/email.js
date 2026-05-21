// src/services/email.js
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const { logger } = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = `"${process.env.FROM_NAME || 'Salaam Microfinance Bank'}" <${process.env.FROM_EMAIL || 'support@salaammfbank.co.ke'}>`;
const BASE_URL = process.env.FRONTEND_URL || 'https://crm.salaammfbank.co.ke';

// Generate HMAC token for CSAT link
const csatToken = (convId) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(convId)).digest('hex').slice(0, 16);

const sendCsat = async (contact, convId) => {
  if (!contact?.email) return;
  const token = csatToken(convId);
  const link  = `${BASE_URL}/csat/${convId}?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to:   contact.email,
    subject: 'How was your experience with Salaam Microfinance Bank?',
    html: `
      <div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:22px;font-weight:800;color:#144A9A;">Salaam</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#888;text-transform:uppercase;margin-top:2px;">Microfinance Bank</div>
        </div>
        <div style="font-size:15px;color:#1a1a2e;line-height:1.7;margin-bottom:20px;">
          As-salamu alaykum ${contact.full_name || 'Valued Customer'},<br><br>
          Thank you for contacting Salaam Microfinance Bank. Your conversation has been resolved.
          We would appreciate your feedback to help us serve you better.
        </div>
        <div style="text-align:center;margin:28px 0;">
          <p style="font-size:13px;color:#777;margin-bottom:14px;">How would you rate your experience?</p>
          <div style="display:inline-flex;gap:8px;">
            ${[1,2,3,4,5].map(n=>`
              <a href="${link}&score=${n}" style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:50%;background:#EEF3FF;color:#144A9A;font-size:18px;font-weight:700;text-decoration:none;">${n}</a>
            `).join('')}
          </div>
          <p style="font-size:11px;color:#aaa;margin-top:8px;">1 = Very poor &nbsp; 5 = Excellent</p>
        </div>
        <hr style="border:none;border-top:1px solid #E0E7F3;margin:24px 0;"/>
        <div style="font-size:11px;color:#aaa;text-align:center;line-height:1.6;">
          Salaam Microfinance Bank &bull; salaammfbank.co.ke<br>
          +254710544444 &bull; +254718373737<br>
          <em>Securing the future together</em>
        </div>
      </div>`,
  });
  logger.info('CSAT email sent', { contact_id: contact.id, conv_id: convId });
};

const sendWelcome = async (member) => {
  await transporter.sendMail({
    from: FROM,
    to:   member.email,
    subject: 'Welcome to Salaam CRM — Your account is ready',
    html: `
      <div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="font-size:22px;font-weight:800;color:#144A9A;margin-bottom:20px;">Salaam CRM</div>
        <p style="font-size:14px;color:#1a1a2e;line-height:1.7;">As-salamu alaykum ${member.full_name},</p>
        <p style="font-size:14px;color:#1a1a2e;line-height:1.7;">Your Salaam CRM account has been created. Please log in and change your password on first login.</p>
        <p style="font-size:14px;color:#1a1a2e;line-height:1.7;">Login at: <a href="${BASE_URL}/login" style="color:#144A9A;">${BASE_URL}/login</a></p>
        <p style="font-size:14px;color:#777;line-height:1.7;">If you did not expect this email, please contact your administrator immediately at +254710544444.</p>
        <hr style="border:none;border-top:1px solid #E0E7F3;margin:24px 0;"/>
        <p style="font-size:11px;color:#aaa;text-align:center;">Salaam Microfinance Bank &bull; Securing the future together</p>
      </div>`,
  });
};

module.exports = { sendCsat, sendWelcome, csatToken };
