// src/components/Layout/Header.jsx
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { BRAND, FONT, BANK_INFO } from '../../utils/constants';

export default function Header() {
  const { user }       = useAuth();
  const { breachCount } = useUser();
  return (
    <div style={{ height: 50, background: '#fff', borderBottom: `1px solid ${BRAND.BORDER}`, display: 'flex', alignItems: 'center', padding: '0 22px', justifyContent: 'space-between', flexShrink: 0, fontFamily: FONT }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: BRAND.NAVY }}>
        {BANK_INFO.name} — Social CRM
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {breachCount > 0 && (
          <span style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 20 }}>
            {breachCount} SLA breach{breachCount > 1 ? 'es' : ''}
          </span>
        )}
        <span style={{ fontSize: 12, color: BRAND.MUTED }}>
          {user?.full_name} &bull; <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
        </span>
      </div>
    </div>
  );
}
