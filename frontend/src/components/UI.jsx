// src/components/UI.jsx — shared UI primitives
import { BRAND, FONT, SOURCE_META, PRIORITY_META, STATUS_META, DEPARTMENT_META } from '../utils/constants';

// ── Platform Logos (SVG, no emojis) ──────────────────────────
export const PlatformLogo = ({ source, size = 14 }) => {
  const s = size;
  const logos = {
    facebook:   <svg width={s} height={s} viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/></svg>,
    instagram:  <svg width={s} height={s} viewBox="0 0 24 24"><defs><radialGradient id="igUI" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="5" fill="url(#igUI)"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>,
    whatsapp:   <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#25D366"/><path d="M17.5 6.5C16 5 14.1 4 12 4 7.6 4 4 7.6 4 12c0 1.4.4 2.8 1 4L4 20l4.1-1.1c1.1.6 2.4 1 3.9 1 4.4 0 8-3.6 8-8 0-2.1-.9-4.1-2.5-5.4zM12 19.2c-1.3 0-2.5-.3-3.6-1l-.3-.2-2.4.6.7-2.3-.2-.3C5.5 14.7 5.1 13.4 5.1 12c0-3.8 3.1-6.9 6.9-6.9 1.8 0 3.5.7 4.8 2s2 3 2 4.9c0 3.8-3.1 6.9-6.8 6.9z" fill="white"/></svg>,
    twitter:    <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#000"/><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/></svg>,
    tiktok:     <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#000"/><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.02a8.27 8.27 0 004.84 1.55V7.12a4.85 4.85 0 01-1.07-.43z" fill="white"/></svg>,
    email:      <svg width={s} height={s} viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>,
    salaampay:  <svg width={s} height={s} viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#144A9A"/><path d="M12 4C7.6 4 4 7.6 4 12s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.5 11.5H8.5V9.5h2v4.5h3V9.5h2v6z" fill="white"/></svg>,
    webform:    <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#6366F1" strokeWidth="2"/><path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20M2 12h20" stroke="#6366F1" strokeWidth="1.5" fill="none"/></svg>,
  };
  const key = source?.toLowerCase().replace(/[^a-z]/g,'').replace('twitterx','twitter').replace('salaampaayapp','salaampay').replace('salaampayapp','salaampay').replace('webform','webform');
  return logos[key] || logos['webform'];
};

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name = '', size = 38 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${BRAND.NAVY_MID},${BRAND.NAVY})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, flexShrink: 0, fontFamily: FONT }}>
      {initials}
    </div>
  );
}

// ── Source chip ───────────────────────────────────────────────
export function SourceChip({ source, small }) {
  const key = source?.toLowerCase();
  const m   = SOURCE_META[key] || { color: BRAND.NAVY, bg: '#EEF3FF', label: source };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: small ? 9 : 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
      <PlatformLogo source={key} size={small ? 9 : 11} /> {m.label || source}
    </span>
  );
}

// ── Priority chip ─────────────────────────────────────────────
export function PriorityChip({ priority, small }) {
  const m = PRIORITY_META[priority?.toLowerCase()] || PRIORITY_META.normal;
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: small ? 9 : 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: FONT }}>
      {m.label}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  const m = STATUS_META[status?.toLowerCase()] || STATUS_META.new;
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, textTransform: 'capitalize', fontFamily: FONT }}>
      {status}
    </span>
  );
}

// ── Department chip ───────────────────────────────────────────
export function DeptChip({ dept }) {
  const m = DEPARTMENT_META[dept] || { bg: '#f0f4fa', color: '#666' };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: FONT }}>
      {dept}
    </span>
  );
}

// ── Role badge ────────────────────────────────────────────────
export function RoleBadge({ role }) {
  const s = { admin: { bg: '#EEF3FF', color: BRAND.NAVY }, agent: { bg: '#F5F5F5', color: '#555' }, viewer: { bg: '#F0FFF4', color: '#166534' } };
  const c = s[role] || s.agent;
  return <span style={{ ...c, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, textTransform: 'capitalize', fontFamily: FONT }}>{role}</span>;
}

// ── Active badge ──────────────────────────────────────────────
export function ActiveBadge({ active }) {
  return (
    <span style={{ background: active ? '#E6F9F0' : '#FFF0F0', color: active ? '#1A7A4A' : '#C62828', fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, fontFamily: FONT }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── SLA timer ─────────────────────────────────────────────────
export function SLATimer({ due, breached, label }) {
  if (!due) return null;
  const diffMin = Math.round((new Date(due) - new Date()) / 60000);
  const overdue = diffMin < 0;
  const color   = (breached || overdue) ? '#EF4444' : diffMin < 30 ? '#F59E0B' : '#10B981';
  const display = overdue ? `${Math.abs(diffMin)}m overdue` : diffMin < 60 ? `${diffMin}m left` : `${Math.round(diffMin / 60)}h left`;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 20, fontFamily: FONT }}>
      {label}: {display}
    </span>
  );
}

// ── Tag chip ──────────────────────────────────────────────────
export function TagChip({ name, color, onRemove }) {
  const c = color || BRAND.NAVY;
  return (
    <span style={{ background: `${c}18`, color: c, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
      {name}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: 'pointer', fontWeight: 800, opacity: 0.6, fontSize: 12, lineHeight: 1 }}>&times;</span>
      )}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)', ...style }}>
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────
export function SectionTitle({ children, style = {} }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.NAVY, marginBottom: 14, fontFamily: FONT, ...style }}>{children}</div>;
}

// ── Page title ────────────────────────────────────────────────
export function PageTitle({ children }) {
  return <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.NAVY, marginBottom: 16, fontFamily: FONT }}>{children}</div>;
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, delta, accentColor }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${accentColor || BRAND.NAVY}`, boxShadow: '0 1px 6px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 10, color: BRAND.MUTED, fontWeight: 500, fontFamily: FONT }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.NAVY, marginTop: 4, fontFamily: FONT }}>{value ?? '—'}</div>
      {delta && <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginTop: 3, fontFamily: FONT }}>{delta}</div>}
    </div>
  );
}

// ── Table head (navy) ─────────────────────────────────────────
export function TableHead({ cols }) {
  return (
    <thead>
      <tr style={{ background: BRAND.NAVY }}>
        {cols.map(c => (
          <th key={c} style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, fontFamily: FONT }}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}
