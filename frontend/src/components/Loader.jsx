// src/components/Loader.jsx
import { BRAND, FONT } from '../utils/constants';

export default function Loader({ size = 32, fullPage }) {
  const spinner = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: `3px solid ${BRAND.BORDER}`, borderTop: `3px solid ${BRAND.NAVY}`, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (fullPage) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.BG }}>
      {spinner}
    </div>
  );
  return spinner;
}

export function ErrorMessage({ message }) {
  return (
    <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '14px 18px', color: '#C62828', fontSize: 13, margin: 20, fontFamily: FONT }}>
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#bbb', fontFamily: FONT }}>
      {icon && <div style={{ marginBottom: 14 }}>{icon}</div>}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#888' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, marginTop: 6, color: '#bbb' }}>{subtitle}</div>}
    </div>
  );
}
