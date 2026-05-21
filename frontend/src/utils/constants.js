// src/utils/constants.js
export const BRAND = {
  NAVY:       '#144A9A',
  NAVY_DARK:  '#0e3470',
  NAVY_MID:   '#1a5bbf',
  NAVY_LIGHT: '#E8EEF8',
  PEACH:      '#F8BA8D',
  PEACH_BG:   '#FFF4EA',
  PEACH_DARK: '#7a3500',
  BG:         '#F5F7FB',
  BORDER:     '#E0E7F3',
  TEXT:       '#1a1a2e',
  MUTED:      '#777777',
};

export const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const BANK_INFO = {
  name:    'Salaam Microfinance Bank',
  slogan:  'Securing the future together',
  website: 'salaammfbank.co.ke',
  phones:  ['+254710544444', '+254718373737'],
  email:   'support@salaammfbank.co.ke',
  branches: ['BBS Mall', 'Prime Mall', 'Kimathi Branch', 'Mombasa Branch'],
};

export const SOURCE_META = {
  facebook:   { label: 'Facebook',      color: '#1877F2', bg: '#EEF3FF' },
  instagram:  { label: 'Instagram',     color: '#C13584', bg: '#FDF0F8' },
  whatsapp:   { label: 'WhatsApp',      color: '#25D366', bg: '#E8FDF1' },
  twitter:    { label: 'Twitter/X',     color: '#000000', bg: '#F0F0F0' },
  tiktok:     { label: 'TikTok',        color: '#010101', bg: '#F0F0F0' },
  email:      { label: 'Email',         color: '#EA4335', bg: '#FFF0EE' },
  salaampay:  { label: 'SalaamPay App', color: '#144A9A', bg: '#EEF3FF' },
  webform:    { label: 'Web Form',      color: '#6366F1', bg: '#F0EEFF' },
};

export const PRIORITY_META = {
  urgent: { label: 'Urgent', color: '#EF4444', bg: '#FFF0F0' },
  high:   { label: 'High',   color: '#F59E0B', bg: '#FFFBEB' },
  medium: { label: 'Medium', color: '#3B82F6', bg: '#EFF6FF' },
  normal: { label: 'Normal', color: '#10B981', bg: '#ECFDF5' },
};

export const STATUS_META = {
  new:       { bg: '#EEF3FF', color: '#144A9A' },
  contacted: { bg: '#FFF4E6', color: '#B85C00' },
  qualified: { bg: '#E6F9F0', color: '#1A7A4A' },
  converted: { bg: '#F0FFF4', color: '#166534' },
  closed:    { bg: '#F5F5F5', color: '#666666' },
};

export const DEPARTMENT_META = {
  'Social Media':      { bg: 'rgba(20,74,154,.1)',  color: '#144A9A' },
  'SalaamPay Support': { bg: 'rgba(124,58,237,.1)', color: '#7C3AED' },
  'Bank Accounts':     { bg: 'rgba(8,145,178,.1)',  color: '#0891B2' },
};

export const SLA_POLICIES = {
  urgent: { first_response_minutes: 30,  resolution_minutes: 240  },
  high:   { first_response_minutes: 60,  resolution_minutes: 480  },
  medium: { first_response_minutes: 120, resolution_minutes: 1440 },
  normal: { first_response_minutes: 240, resolution_minutes: 2880 },
};

export const PIPELINE_STAGES = [
  { key: 'new',       label: 'New',       color: '#144A9A' },
  { key: 'contacted', label: 'Contacted', color: '#F59E0B' },
  { key: 'qualified', label: 'Qualified', color: '#10B981' },
  { key: 'converted', label: 'Converted', color: '#6366F1' },
  { key: 'closed',    label: 'Closed',    color: '#6B7280' },
];

export const ALL_CHANNELS  = Object.keys(SOURCE_META);
export const ALL_DEPTS     = Object.keys(DEPARTMENT_META);
export const CONV_STATUSES = ['open','resolved','snoozed','spam'];
export const ROLES         = ['admin','agent','viewer'];

export const NAV_ITEMS = [
  { path: '/inbox',           label: 'Inbox',           roles: ['admin','agent','viewer'] },
  { path: '/dashboard',       label: 'Dashboard',       roles: ['admin','agent']          },
  { path: '/contacts',        label: 'Contacts',        roles: ['admin','agent','viewer'] },
  { path: '/pipeline',        label: 'Pipeline',        roles: ['admin','agent']          },
  { path: '/canned',          label: 'Quick Replies',   roles: ['admin','agent']          },
  { path: '/broadcasts',      label: 'Broadcasts',      roles: ['admin']                  },
  { path: '/admin',           label: 'Admin',           roles: ['admin']                  },
  { path: '/admin/roles',     label: 'Roles',           roles: ['admin']                  },
  { path: '/admin/reports',   label: 'Reports',         roles: ['admin']                  },
  { path: '/admin/audit',     label: 'Audit Trail',     roles: ['admin']                  },
];
