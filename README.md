# Salaam Microfinance Bank — Social CRM v3
# IT Deployment & Operations Guide
# salaammfbank.co.ke | +254710544444 | +254718373737
# Securing the future together
# =============================================================

## What is new in v3

### Features added
- WhatsApp Broadcast Messaging (templates, audience builder, send/cancel, delivery tracking)
- Opt-in / opt-out management with Kenya Data Protection Act 2019 compliance
- Refresh token rotation (JWT access tokens expire in 15 minutes, refresh tokens in 7 days)
- Account lockout after 5 failed login attempts (configurable)
- Login audit log (every login attempt logged with IP, user agent, success/failure)
- Must-change-password flag on new accounts
- Password strength enforcement (min 10 chars, uppercase, number, special character)
- XSS sanitization middleware on all POST/PATCH endpoints
- Timing-safe login (prevents user enumeration via timing attacks)
- Soft delete / blacklist for contacts (no hard deletes)
- Branch-specific tags (BBS Mall, Prime Mall, Kimathi Branch, Mombasa Branch)
- SalaamPay opt-in tracking per contact
- Canned responses include all correct phone numbers and website
- Public support form with consent checkbox

### Security hardening
- Helmet.js with strict CSP, HSTS (1 year), X-Frame-Options
- Rate limiting: 100 req/15min globally, 10 req/15min on /auth/login
- CORS whitelist (only FRONTEND_URL is allowed)
- All webhook signatures verified using crypto.timingSafeEqual
- Refresh tokens stored as SHA-256 hashes (plain token never stored)
- sessionStorage for access token (cleared on tab close)
- localStorage for refresh token only (persists for 7 days)
- Axios interceptor auto-refreshes tokens before expiry

---

## Deployment Order

### Step 1 — Database
```bash
psql -U postgres -d salaam_crm -f schema-v3.sql
```

### Step 2 — Backend
```bash
cd backend
cp .env.example .env
nano .env          # Fill in all values — especially JWT secrets
npm install
pm2 start src/server.js --name salaam-crm-api
pm2 save
pm2 startup
```

### Step 3 — Frontend
```bash
cd frontend
cp .env.example .env
nano .env          # Set REACT_APP_API_URL
npm install
npm run build
```

### Step 4 — Nginx
```nginx
server {
    server_name crm.salaammfbank.co.ke;
    root /var/www/salaam-crm-frontend/build;
    index index.html;

    # Security headers (supplement Helmet.js)
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/crm.salaammfbank.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.salaammfbank.co.ke/privkey.pem;
}
server {
    listen 80;
    server_name crm.salaammfbank.co.ke;
    return 301 https://$host$request_uri;
}
```

### Step 5 — Create first admin account
```bash
node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
bcrypt.hash('ChangeMe!2026', 12).then(hash => {
  pool.query(\`INSERT INTO team_members (full_name, email, password_hash, role, must_change_password)
    VALUES ('Salaam Admin', 'admin@salaammfbank.co.ke', '\${hash}', 'admin', TRUE)\`);
  console.log('Admin created. Login and change password immediately.');
});
"
```

---

## Environment Variables (.env)

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | YES | PostgreSQL connection string |
| JWT_SECRET | YES | 64-char random hex — generate: openssl rand -hex 64 |
| REFRESH_TOKEN_SECRET | YES | Different 64-char secret |
| WHATSAPP_PHONE_NUMBER_ID | For WhatsApp | From Meta Developer Portal |
| WHATSAPP_ACCESS_TOKEN | For WhatsApp | System user token |
| META_APP_SECRET | For FB/IG | From Meta Developer Portal |
| META_VERIFY_TOKEN | For FB/IG | Random string you choose |
| TWITTER_CONSUMER_SECRET | For Twitter | From developer.twitter.com |
| SALAAMPAY_API_SECRET | For SalaamPay | Shared with SalaamPay dev team |
| SMTP_HOST | For email | Mailgun or your mail server |
| SMTP_USER / SMTP_PASS | For email | SMTP credentials |

---

## Routes

| Route | Auth | Description |
|---|---|---|
| POST /api/auth/login | Public | Login |
| POST /api/auth/refresh | Public | Refresh JWT |
| POST /api/auth/logout | Token | Logout + revoke refresh token |
| GET /api/auth/me | Token | Current user profile |
| POST /api/auth/change-password | Token | Change password |
| GET /api/conversations | Token | Inbox (filtered by user channels) |
| PATCH /api/conversations/:id | Agent+ | Update status/priority/assignment |
| POST /api/messages/conversations/:id/messages | Agent+ | Send reply or internal note |
| GET /api/contacts | Token | List contacts |
| GET /api/dashboard/stats | Token | Dashboard data |
| GET /api/dashboard/sla-breaches | Token | Current SLA breaches |
| GET /api/audit | Admin | Audit trail |
| GET/POST /api/broadcasts | Admin | Broadcast management |
| POST /api/broadcasts/:id/send | Admin | Send broadcast |
| POST /api/broadcasts/opt-in | Token | Record customer opt-in |
| POST /api/broadcasts/opt-out | Public | Handle STOP from customer |
| POST /api/webhooks/meta | Public+sig | Facebook/Instagram inbound |
| POST /api/webhooks/whatsapp | Public+sig | WhatsApp inbound |
| POST /api/webhooks/twitter | Public+sig | Twitter/X inbound |
| POST /api/webhooks/tiktok | Public+sig | TikTok inbound |
| POST /api/webhooks/email | Public | Email inbound (Mailgun) |
| POST /api/webhooks/salaampay | Secret | SalaamPay ticket |
| POST /api/webhooks/webform | Public | Web form submission |

---

## Broadcast Setup Guide

1. Install WhatsApp Business API (360Dialog or Meta Cloud API)
2. Create templates in the CRM at /broadcasts > Templates tab
3. Submit templates to Meta for approval via developer.facebook.com
4. Once Meta approves, mark the template as Approved in the CRM
5. Set audience filters and create a broadcast
6. Send immediately or schedule

Note: Only contacts with opted_in_whatsapp = TRUE will receive broadcasts.
Customers opt in by messaging your WhatsApp number (automatically recorded).
Customers opt out by replying STOP (automatically processed via webhook).

---

## Branches Reference

| Branch | City |
|---|---|
| BBS Mall | Eastleigh, Nairobi |
| Prime Mall | Eastleigh, Nairobi |
| Kimathi Branch | Nairobi CBD |
| Mombasa Branch | Mombasa |

Contact: +254710544444 | +254718373737
Website: salaammfbank.co.ke
Slogan:  Securing the future together
