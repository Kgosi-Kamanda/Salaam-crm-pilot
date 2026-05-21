-- =============================================================
-- SALAAM MICROFINANCE BANK — SOCIAL CRM
-- Database Schema v3.0
-- April 2026
-- Website: salaammfbank.co.ke
-- Contact: +254710544444 / +254718373737
-- Branches: BBS Mall (Eastleigh), Prime Mall (Eastleigh),
--           Kimathi Branch (Nairobi CBD), Mombasa Branch
-- Slogan: Securing the future together
-- =============================================================
-- IMPORTANT: Run as the postgres superuser
-- psql -U postgres -d salaam_crm -f schema-v3.sql
-- =============================================================

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- SECTION 1: DEPARTMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color       VARCHAR(7)  DEFAULT '#144A9A',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name, description, color) VALUES
    ('Social Media',       'Handles Facebook, Instagram, Twitter/X, TikTok enquiries and leads',       '#144A9A'),
    ('SalaamPay Support',  'Handles SalaamPay app tickets, E-Murabaha issues, wallet transactions',    '#7C3AED'),
    ('Bank Accounts',      'Handles account openings, financing applications, branch enquiries',        '#0891B2')
ON CONFLICT (name) DO NOTHING;

-- =============================================================
-- SECTION 2: TEAM MEMBERS
-- =============================================================
CREATE TABLE IF NOT EXISTS team_members (
    id              SERIAL PRIMARY KEY,
    uuid            UUID        DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'agent'
                    CHECK (role IN ('admin','agent','viewer')),
    is_active       BOOLEAN     DEFAULT TRUE,
    failed_logins   SMALLINT    DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   INET,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SECTION 3: MEMBER CHANNELS (per-user channel access)
-- =============================================================
CREATE TABLE IF NOT EXISTS member_channels (
    id              SERIAL PRIMARY KEY,
    team_member_id  INT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    platform        VARCHAR(30) NOT NULL
                    CHECK (platform IN ('facebook','instagram','whatsapp','twitter','tiktok','email','salaampay','webform')),
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    granted_by      INT REFERENCES team_members(id),
    UNIQUE(team_member_id, platform)
);

-- =============================================================
-- SECTION 4: MEMBER DEPARTMENTS (per-user department access)
-- =============================================================
CREATE TABLE IF NOT EXISTS member_departments (
    id              SERIAL PRIMARY KEY,
    team_member_id  INT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    department_id   INT NOT NULL REFERENCES departments(id)  ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    granted_by      INT REFERENCES team_members(id),
    UNIQUE(team_member_id, department_id)
);

-- =============================================================
-- SECTION 5: SOURCES (channels)
-- =============================================================
CREATE TABLE IF NOT EXISTS sources (
    id          SERIAL PRIMARY KEY,
    platform    VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    webhook_secret VARCHAR(255),
    access_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sources (platform, display_name) VALUES
    ('facebook',  'Facebook'),
    ('instagram', 'Instagram'),
    ('whatsapp',  'WhatsApp Business'),
    ('twitter',   'Twitter/X'),
    ('tiktok',    'TikTok'),
    ('email',     'Email'),
    ('salaampay', 'SalaamPay App'),
    ('webform',   'Web Form')
ON CONFLICT (platform) DO NOTHING;

-- =============================================================
-- SECTION 6: SLA POLICIES
-- =============================================================
CREATE TABLE IF NOT EXISTS sla_policies (
    id                        SERIAL PRIMARY KEY,
    priority                  VARCHAR(10) NOT NULL UNIQUE
                              CHECK (priority IN ('urgent','high','medium','normal')),
    first_response_minutes    INT NOT NULL,
    resolution_minutes        INT NOT NULL,
    escalation_minutes        INT,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sla_policies (priority, first_response_minutes, resolution_minutes, escalation_minutes) VALUES
    ('urgent', 30,   240,   15),
    ('high',   60,   480,   30),
    ('medium', 120,  1440,  60),
    ('normal', 240,  2880,  120)
ON CONFLICT (priority) DO NOTHING;

-- =============================================================
-- SECTION 7: TAGS (52 pre-loaded)
-- =============================================================
CREATE TABLE IF NOT EXISTS tags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(60)  NOT NULL UNIQUE,
    category    VARCHAR(40)  NOT NULL,
    color       VARCHAR(7)   DEFAULT '#144A9A',
    sets_priority VARCHAR(10) CHECK (sets_priority IN ('urgent','high','medium','normal')),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO tags (name, category, color, sets_priority) VALUES
-- SalaamPay Transactions
    ('pending-transaction',             'SalaamPay Transactions', '#EF4444', 'high'),
    ('failed-transaction',              'SalaamPay Transactions', '#EF4444', 'urgent'),
    ('reversal-request',                'SalaamPay Transactions', '#EF4444', 'urgent'),
    ('duplicate-charge',                'SalaamPay Transactions', '#EF4444', 'urgent'),
    ('wrong-recipient',                 'SalaamPay Transactions', '#F59E0B', 'high'),
-- SalaamPay Account
    ('password-reset',                  'SalaamPay Account',      '#6366F1', 'medium'),
    ('account-locked',                  'SalaamPay Account',      '#EF4444', 'urgent'),
    ('biometric-issue',                 'SalaamPay Account',      '#6366F1', 'medium'),
    ('account-verification',            'SalaamPay Account',      '#6366F1', 'medium'),
    ('device-change',                   'SalaamPay Account',      '#6366F1', 'medium'),
-- SalaamPay E-Murabaha
    ('emurabaha-onboarding',            'SalaamPay E-Murabaha',   '#144A9A', 'medium'),
    ('emurabaha-limit-check',           'SalaamPay E-Murabaha',   '#144A9A', 'medium'),
    ('emurabaha-disbursement-delay',    'SalaamPay E-Murabaha',   '#F59E0B', 'high'),
    ('emurabaha-repayment',             'SalaamPay E-Murabaha',   '#144A9A', 'medium'),
    ('emurabaha-statement',             'SalaamPay E-Murabaha',   '#144A9A', 'medium'),
    ('emurabaha-eligibility',           'SalaamPay E-Murabaha',   '#144A9A', 'medium'),
-- SalaamPay Wallet
    ('wallet-topup',                    'SalaamPay Wallet',       '#10B981', 'medium'),
    ('wallet-withdrawal',               'SalaamPay Wallet',       '#F59E0B', 'high'),
    ('wallet-balance',                  'SalaamPay Wallet',       '#10B981', 'medium'),
-- SalaamPay App
    ('app-crash',                       'SalaamPay App',          '#EF4444', 'high'),
    ('slow-performance',                'SalaamPay App',          '#F59E0B', 'medium'),
    ('feature-request',                 'SalaamPay App',          '#10B981', 'normal'),
    ('fraud-report',                    'SalaamPay App',          '#EF4444', 'urgent'),
-- Bank Financing
    ('asset-financing',                 'Bank Financing',         '#0891B2', 'normal'),
    ('business-capital',                'Bank Financing',         '#0891B2', 'normal'),
    ('stock-financing',                 'Bank Financing',         '#0891B2', 'normal'),
    ('land-financing',                  'Bank Financing',         '#0891B2', 'normal'),
    ('house-financing',                 'Bank Financing',         '#0891B2', 'normal'),
    ('financing-application',           'Bank Financing',         '#0891B2', 'normal'),
    ('financing-approval',              'Bank Financing',         '#0891B2', 'normal'),
    ('financing-disbursement',          'Bank Financing',         '#0891B2', 'normal'),
    ('financing-repayment',             'Bank Financing',         '#0891B2', 'normal'),
    ('financing-statement',             'Bank Financing',         '#0891B2', 'normal'),
-- Bank Accounts
    ('savings-account',                 'Bank Accounts',          '#7C3AED', 'normal'),
    ('current-account',                 'Bank Accounts',          '#7C3AED', 'normal'),
    ('business-account',                'Bank Accounts',          '#7C3AED', 'normal'),
    ('account-opening',                 'Bank Accounts',          '#7C3AED', 'normal'),
    ('account-closure',                 'Bank Accounts',          '#7C3AED', 'normal'),
    ('account-statement',               'Bank Accounts',          '#7C3AED', 'normal'),
-- General
    ('branch-bbs-mall',                 'General',                '#144A9A', 'normal'),
    ('branch-prime-mall',               'General',                '#144A9A', 'normal'),
    ('branch-kimathi',                  'General',                '#144A9A', 'normal'),
    ('branch-mombasa',                  'General',                '#144A9A', 'normal'),
    ('complaint',                       'General',                '#EF4444', 'high'),
    ('compliment',                      'General',                '#10B981', 'normal'),
    ('general-enquiry',                 'General',                '#888888', 'normal'),
    ('follow-up',                       'General',                '#F59E0B', 'normal'),
    ('social-media-lead',               'General',                '#F8BA8D', 'normal'),
    ('salaamsocial-lead',               'General',                '#F8BA8D', 'normal'),
    ('salaammart-enquiry',              'General',                '#144A9A', 'normal'),
    ('website-form',                    'General',                '#6366F1', 'normal')
ON CONFLICT (name) DO NOTHING;

-- =============================================================
-- SECTION 8: CONTACTS
-- =============================================================
CREATE TABLE IF NOT EXISTS contacts (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    full_name           VARCHAR(200),
    email               VARCHAR(255),
    phone               VARCHAR(30),
    salaampay_account   VARCHAR(50),
    platform_ids        JSONB DEFAULT '{}',
    primary_source      VARCHAR(30),
    department          VARCHAR(60),
    status              VARCHAR(20) DEFAULT 'new'
                        CHECK (status IN ('new','contacted','qualified','converted','closed')),
    notes               TEXT,
    opted_in_whatsapp   BOOLEAN DEFAULT FALSE,
    opted_in_email      BOOLEAN DEFAULT FALSE,
    opted_in_at         TIMESTAMPTZ,
    opt_in_source       VARCHAR(60),
    branch              VARCHAR(50)
                        CHECK (branch IN ('BBS Mall','Prime Mall','Kimathi Branch','Mombasa Branch')),
    is_blacklisted      BOOLEAN DEFAULT FALSE,
    blacklist_reason    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_email   ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone   ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status  ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_sp_acct ON contacts(salaampay_account);

-- =============================================================
-- SECTION 9: CONVERSATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id                      SERIAL PRIMARY KEY,
    uuid                    UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    contact_id              INT REFERENCES contacts(id) ON DELETE SET NULL,
    source_platform         VARCHAR(30) NOT NULL,
    external_thread_id      VARCHAR(255),
    department_id           INT REFERENCES departments(id),
    assigned_to             INT REFERENCES team_members(id) ON DELETE SET NULL,
    status                  VARCHAR(20) DEFAULT 'open'
                            CHECK (status IN ('open','resolved','snoozed','spam')),
    priority                VARCHAR(10) DEFAULT 'normal'
                            CHECK (priority IN ('urgent','high','medium','normal')),
    subject                 VARCHAR(500),
    channel_metadata        JSONB DEFAULT '{}',
    sla_first_response_due  TIMESTAMPTZ,
    sla_resolution_due      TIMESTAMPTZ,
    sla_response_breached   BOOLEAN DEFAULT FALSE,
    sla_resolution_breached BOOLEAN DEFAULT FALSE,
    first_response_at       TIMESTAMPTZ,
    resolved_at             TIMESTAMPTZ,
    resolved_by             INT REFERENCES team_members(id),
    csat_score              SMALLINT CHECK (csat_score BETWEEN 1 AND 5),
    csat_comment            TEXT,
    csat_sent_at            TIMESTAMPTZ,
    csat_received_at        TIMESTAMPTZ,
    snooze_until            TIMESTAMPTZ,
    is_spam                 BOOLEAN DEFAULT FALSE,
    spam_reason             TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_contact     ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conv_status      ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_priority    ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conv_assigned    ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conv_source      ON conversations(source_platform);
CREATE INDEX IF NOT EXISTS idx_conv_sla_resp    ON conversations(sla_first_response_due) WHERE sla_response_breached = FALSE;

-- =============================================================
-- SECTION 10: CONVERSATION TAGS
-- =============================================================
CREATE TABLE IF NOT EXISTS conversation_tags (
    id              SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id          INT NOT NULL REFERENCES tags(id)         ON DELETE CASCADE,
    added_by        INT REFERENCES team_members(id),
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, tag_id)
);

-- =============================================================
-- SECTION 11: MESSAGES
-- =============================================================
CREATE TABLE IF NOT EXISTS messages (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    conversation_id     INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction           VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
    body                TEXT,
    media_urls          JSONB DEFAULT '[]',
    is_internal_note    BOOLEAN DEFAULT FALSE,
    sent_by             INT REFERENCES team_members(id),
    external_message_id VARCHAR(255),
    platform_metadata   JSONB DEFAULT '{}',
    delivery_status     VARCHAR(20) DEFAULT 'sent'
                        CHECK (delivery_status IN ('pending','sent','delivered','read','failed')),
    sent_at             TIMESTAMPTZ DEFAULT NOW(),
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    deleted_by          INT REFERENCES team_members(id)
);
CREATE INDEX IF NOT EXISTS idx_msg_conv    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_sent_at ON messages(sent_at);

-- =============================================================
-- SECTION 12: CANNED RESPONSES
-- =============================================================
CREATE TABLE IF NOT EXISTS canned_responses (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    shortcut        VARCHAR(50),
    body            TEXT NOT NULL,
    category        VARCHAR(60),
    is_shared       BOOLEAN DEFAULT TRUE,
    created_by      INT REFERENCES team_members(id),
    use_count       INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO canned_responses (title, shortcut, body, category, is_shared) VALUES
    ('Arabic Greeting',              '/salam',      'As-salamu alaykum! Thank you for reaching out to Salaam Microfinance Bank. How may we assist you today? | Salaam — Securing the future together | salaammfbank.co.ke', 'Greetings', TRUE),
    ('English Greeting',             '/greet',      'Hello! Thank you for contacting Salaam Microfinance Bank. How can we help you today?', 'Greetings', TRUE),
    ('Pending Transaction',          '/pending',    'We have received your query regarding your pending transaction. Our team is investigating and will provide an update within 2 hours. Reference: {{reference}}', 'SalaamPay', TRUE),
    ('Reversal Request Received',    '/reversal',   'Thank you for bringing this to our attention. We have logged your reversal request and our team will process it within 24 hours. JazakAllah Khayr.', 'SalaamPay', TRUE),
    ('E-Murabaha Onboarding',        '/emurabaha',  'Thank you for your interest in our E-Murabaha facility. Please ensure you have your valid national ID, recent payslip, and SalaamPay account ready. Our team will guide you through the process. salaammfbank.co.ke', 'E-Murabaha', TRUE),
    ('Password Reset Guide',         '/reset',      'To reset your SalaamPay password, open the app and tap Forgot Password on the login screen. You will receive an OTP on your registered phone number. If you need further help call us: +254710544444.', 'SalaamPay', TRUE),
    ('Resolution Closing',           '/close',      'We are glad we could assist you today. Please do not hesitate to reach out if you need further assistance. JazakAllah Khayr! | Salaam Microfinance Bank — Securing the future together', 'Closing', TRUE),
    ('Branch — BBS Mall',            '/bbs',        'Our BBS Mall branch is located in Eastleigh. Branch phone: +254710544444. Open Monday to Friday 8:30 AM – 4:30 PM, Saturday 9:00 AM – 1:00 PM.', 'Branch Info', TRUE),
    ('Branch — Prime Mall',          '/prime',      'Our Prime Mall branch is located in Eastleigh. Branch phone: +254710544444. Open Monday to Friday 8:30 AM – 4:30 PM, Saturday 9:00 AM – 1:00 PM.', 'Branch Info', TRUE),
    ('Branch — Kimathi (CBD)',        '/kimathi',    'Our Kimathi Street branch is located in Nairobi CBD. Branch phone: +254718373737. Open Monday to Friday 8:30 AM – 4:30 PM, Saturday 9:00 AM – 1:00 PM.', 'Branch Info', TRUE),
    ('Branch — Mombasa',             '/mombasa',    'Our Mombasa branch contact: +254718373737. Open Monday to Friday 8:30 AM – 4:30 PM, Saturday 9:00 AM – 1:00 PM.', 'Branch Info', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================
-- SECTION 13: LEADS
-- =============================================================
CREATE TABLE IF NOT EXISTS leads (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    source_platform VARCHAR(30),
    full_name       VARCHAR(200),
    email           VARCHAR(255),
    phone           VARCHAR(30),
    message         TEXT,
    form_name       VARCHAR(100),
    page_url        VARCHAR(500),
    utm_source      VARCHAR(100),
    utm_campaign    VARCHAR(100),
    ip_address      INET,
    is_converted    BOOLEAN DEFAULT FALSE,
    contact_id      INT REFERENCES contacts(id),
    converted_at    TIMESTAMPTZ,
    converted_by    INT REFERENCES team_members(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SECTION 14: SALAAMPAY TICKETS
-- =============================================================
CREATE TABLE IF NOT EXISTS salaampay_tickets (
    id                  SERIAL PRIMARY KEY,
    uuid                UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    conversation_id     INT REFERENCES conversations(id),
    contact_id          INT REFERENCES contacts(id),
    salaampay_account   VARCHAR(50),
    ticket_type         VARCHAR(60),
    description         TEXT,
    error_code          VARCHAR(30),
    transaction_ref     VARCHAR(100),
    amount_ksh          NUMERIC(14,2),
    device_model        VARCHAR(100),
    app_version         VARCHAR(20),
    os_version          VARCHAR(30),
    screenshot_urls     JSONB DEFAULT '[]',
    status              VARCHAR(20) DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','resolved','closed')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SECTION 15: BROADCAST MESSAGES (WhatsApp Marketing)
-- =============================================================
CREATE TABLE IF NOT EXISTS broadcast_templates (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    category        VARCHAR(30) NOT NULL
                    CHECK (category IN ('marketing','utility','transactional','authentication')),
    language        VARCHAR(10) DEFAULT 'en',
    body_text       TEXT NOT NULL,
    header_text     VARCHAR(255),
    footer_text     VARCHAR(255),
    variables       JSONB DEFAULT '[]',
    meta_template_name VARCHAR(100),
    approval_status VARCHAR(20) DEFAULT 'pending'
                    CHECK (approval_status IN ('pending','approved','rejected')),
    meta_approved_at TIMESTAMPTZ,
    requires_opt_in  BOOLEAN DEFAULT TRUE,
    created_by      INT REFERENCES team_members(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcasts (
    id              SERIAL PRIMARY KEY,
    uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    template_id     INT NOT NULL REFERENCES broadcast_templates(id),
    name            VARCHAR(200) NOT NULL,
    audience_filter JSONB DEFAULT '{}',
    audience_count  INT DEFAULT 0,
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','cancelled','failed')),
    sent_count      INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count      INT DEFAULT 0,
    failed_count    INT DEFAULT 0,
    created_by      INT REFERENCES team_members(id),
    cancelled_by    INT REFERENCES team_members(id),
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id              SERIAL PRIMARY KEY,
    broadcast_id    INT NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    contact_id      INT NOT NULL REFERENCES contacts(id)   ON DELETE CASCADE,
    phone           VARCHAR(30) NOT NULL,
    variables       JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','delivered','read','failed','opted_out')),
    wa_message_id   VARCHAR(255),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    failed_reason   TEXT,
    UNIQUE(broadcast_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_bcast_recipients ON broadcast_recipients(broadcast_id, status);

-- =============================================================
-- SECTION 16: PLATFORM API TOKENS
-- =============================================================
CREATE TABLE IF NOT EXISTS platform_tokens (
    id                  SERIAL PRIMARY KEY,
    platform            VARCHAR(30) NOT NULL UNIQUE,
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    page_id             VARCHAR(100),
    phone_number_id     VARCHAR(100),
    waba_id             VARCHAR(100),
    webhook_verify_token VARCHAR(255),
    app_secret          VARCHAR(255),
    extra_config        JSONB DEFAULT '{}',
    last_used_at        TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT TRUE,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SECTION 17: REFRESH TOKENS (security — JWT rotation)
-- =============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              SERIAL PRIMARY KEY,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    team_member_id  INT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoke_reason   VARCHAR(100),
    user_agent      TEXT,
    ip_address      INET,
    is_revoked      BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_rt_member ON refresh_tokens(team_member_id);
CREATE INDEX IF NOT EXISTS idx_rt_hash   ON refresh_tokens(token_hash) WHERE is_revoked = FALSE;

-- =============================================================
-- SECTION 18: SECURITY — LOGIN AUDIT LOG
-- =============================================================
CREATE TABLE IF NOT EXISTS login_audit (
    id              SERIAL PRIMARY KEY,
    team_member_id  INT REFERENCES team_members(id),
    email_attempted VARCHAR(255),
    success         BOOLEAN NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    failure_reason  VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_audit_member ON login_audit(team_member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip     ON login_audit(ip_address, created_at);

-- =============================================================
-- SECTION 19: ACTIVITY LOG (full audit trail)
-- =============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id              BIGSERIAL PRIMARY KEY,
    team_member_id  INT REFERENCES team_members(id) ON DELETE SET NULL,
    contact_id      INT REFERENCES contacts(id)      ON DELETE SET NULL,
    conversation_id INT REFERENCES conversations(id) ON DELETE SET NULL,
    action          VARCHAR(60) NOT NULL,
    details         JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_al_member  ON activity_log(team_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_action  ON activity_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_contact ON activity_log(contact_id, created_at DESC);

-- =============================================================
-- SECTION 20: VIEWS
-- =============================================================

-- Inbox view
CREATE OR REPLACE VIEW v_inbox AS
SELECT
    c.id            AS conversation_id,
    c.uuid          AS conversation_uuid,
    c.status,
    c.priority,
    c.source_platform AS source,
    c.department_id,
    d.name          AS department,
    c.assigned_to,
    tm.full_name    AS assigned_to_name,
    ct.id           AS contact_id,
    ct.full_name    AS contact_name,
    ct.phone        AS contact_phone,
    ct.email        AS contact_email,
    ct.salaampay_account,
    c.sla_first_response_due,
    c.sla_resolution_due,
    c.sla_response_breached,
    c.sla_resolution_breached,
    c.created_at,
    c.updated_at,
    (SELECT body FROM messages
     WHERE conversation_id = c.id
       AND is_internal_note = FALSE
     ORDER BY sent_at DESC LIMIT 1) AS latest_message,
    (SELECT sent_at FROM messages
     WHERE conversation_id = c.id
     ORDER BY sent_at DESC LIMIT 1) AS last_message_at,
    (SELECT COUNT(*) FROM messages
     WHERE conversation_id = c.id
       AND direction = 'inbound'
       AND sent_at > COALESCE(c.first_response_at, '1970-01-01')) AS unread_count,
    ARRAY(
        SELECT t.name FROM conversation_tags ct2
        JOIN tags t ON t.id = ct2.tag_id
        WHERE ct2.conversation_id = c.id
    ) AS tags
FROM conversations c
LEFT JOIN contacts     ct ON ct.id = c.contact_id
LEFT JOIN departments   d ON d.id  = c.department_id
LEFT JOIN team_members tm ON tm.id = c.assigned_to;

-- Dashboard stats
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    COUNT(*)                                                        AS total_contacts,
    COUNT(*) FILTER (WHERE status = 'new')                          AS new_leads,
    COUNT(*) FILTER (WHERE status = 'contacted')                    AS contacted,
    COUNT(*) FILTER (WHERE status = 'qualified')                    AS qualified,
    COUNT(*) FILTER (WHERE status = 'converted')                    AS converted,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')  AS new_today
FROM contacts;

-- SLA breaches
CREATE OR REPLACE VIEW v_sla_breaches AS
SELECT
    c.id            AS conversation_id,
    c.priority,
    c.source_platform AS source,
    ct.full_name    AS contact_name,
    tm.full_name    AS assigned_to,
    c.sla_first_response_due,
    EXTRACT(EPOCH FROM (NOW() - c.sla_first_response_due)) / 60 AS response_overdue_minutes,
    c.sla_resolution_due,
    c.created_at
FROM conversations c
LEFT JOIN contacts     ct ON ct.id = c.contact_id
LEFT JOIN team_members tm ON tm.id = c.assigned_to
WHERE c.status = 'open'
  AND (c.sla_response_breached = TRUE OR c.sla_resolution_breached = TRUE)
ORDER BY c.sla_first_response_due ASC;

-- Agent performance
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT
    tm.id                       AS agent_id,
    tm.full_name                AS agent_name,
    COUNT(c.id)                 AS total_conversations,
    COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved,
    COUNT(c.id) FILTER (WHERE c.first_response_at IS NOT NULL
                           AND c.first_response_at <= c.sla_first_response_due) AS sla_response_met,
    COUNT(c.id) FILTER (WHERE c.resolved_at IS NOT NULL
                           AND c.resolved_at <= c.sla_resolution_due)           AS sla_resolution_met,
    ROUND(AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)) / 60)
          FILTER (WHERE c.first_response_at IS NOT NULL))                       AS avg_first_response_mins,
    ROUND(AVG(c.csat_score) FILTER (WHERE c.csat_score IS NOT NULL), 1)        AS avg_csat
FROM team_members tm
LEFT JOIN conversations c ON c.assigned_to = tm.id
    AND c.created_at >= NOW() - INTERVAL '30 days'
WHERE tm.is_active = TRUE AND tm.role = 'agent'
GROUP BY tm.id, tm.full_name;

-- =============================================================
-- SECTION 21: TRIGGERS
-- =============================================================

-- Auto-set SLA deadlines on new conversation
CREATE OR REPLACE FUNCTION fn_set_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
    v_first_mins INT;
    v_res_mins   INT;
BEGIN
    SELECT first_response_minutes, resolution_minutes
    INTO v_first_mins, v_res_mins
    FROM sla_policies WHERE priority = NEW.priority;

    NEW.sla_first_response_due := NEW.created_at + (v_first_mins * INTERVAL '1 minute');
    NEW.sla_resolution_due     := NEW.created_at + (v_res_mins   * INTERVAL '1 minute');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sla_deadlines ON conversations;
CREATE TRIGGER trg_sla_deadlines
    BEFORE INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION fn_set_sla_deadlines();

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conv_updated   BEFORE UPDATE ON conversations   FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_contact_updated BEFORE UPDATE ON contacts       FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_member_updated BEFORE UPDATE ON team_members    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- Auto-check SLA breaches on conversation update
CREATE OR REPLACE FUNCTION fn_check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'open' THEN
        IF NEW.first_response_at IS NULL AND NOW() > NEW.sla_first_response_due THEN
            NEW.sla_response_breached := TRUE;
        END IF;
        IF NEW.resolved_at IS NULL AND NOW() > NEW.sla_resolution_due THEN
            NEW.sla_resolution_breached := TRUE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sla_breach ON conversations;
CREATE TRIGGER trg_sla_breach
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION fn_check_sla_breach();

-- =============================================================
-- SECTION 22: ROW-LEVEL SECURITY (optional — enable per table)
-- =============================================================
-- Uncomment to enable RLS on conversations (agents only see assigned depts)
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- END OF SCHEMA
-- Version: 3.0.0 | April 2026
-- Salaam Microfinance Bank — Social CRM
-- salaammfbank.co.ke | +254710544444 | +254718373737
-- Securing the future together
-- =============================================================
