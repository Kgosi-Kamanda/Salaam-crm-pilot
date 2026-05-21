// src/components/Layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { BRAND, FONT, BANK_INFO, NAV_ITEMS, SOURCE_META } from '../../utils/constants';
import { PlatformLogo, Avatar } from '../UI.jsx';

export default function Sidebar() {
  const { user, logout }                        = useAuth();
  const { unreadCount, breachCount, myChannels } = useUser();
  const navigate   = useNavigate();
  const location   = useLocation();

  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));

  return (
    <div style={{ width: 214, background: `linear-gradient(180deg,${BRAND.NAVY_DARK} 0%,${BRAND.NAVY} 100%)`, display: 'flex', flexDirection: 'column', flexShrink: 0, fontFamily: FONT }}>
      {/* Logo */}
      <div style={{ padding: '17px 16px 14px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Salaam</div>
        <div style={{ fontSize: 8, color: BRAND.PEACH, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Microfinance Bank</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.28)', marginTop: 1 }}>Social CRM v3</div>
      </div>

      {/* SLA breach alert */}
      {breachCount > 0 && (
        <div onClick={() => navigate('/inbox')} style={{ margin: '8px 10px 0', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.5)', borderRadius: 7, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 16 16"><path d="M8 2L1 14h14L8 2z" stroke="#fca5a5" strokeWidth="1.5" fill="none"/><line x1="8" y1="7" x2="8" y2="10" stroke="#fca5a5" strokeWidth="1.5"/><circle cx="8" cy="12" r=".8" fill="#fca5a5"/></svg>
          <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>{breachCount} SLA breach{breachCount > 1 ? 'es' : ''}</span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {visibleNav.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <div key={item.path} onClick={() => navigate(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
              borderRadius: 9, cursor: 'pointer', marginBottom: 2,
              background: active ? 'rgba(255,255,255,.15)' : 'transparent',
              borderLeft: `3px solid ${active ? BRAND.PEACH : 'transparent'}`,
              transition: 'background .12s',
            }}>
              <span style={{ fontSize: 12, color: active ? '#fff' : 'rgba(255,255,255,.6)', fontWeight: active ? 700 : 500, flex: 1 }}>
                {item.label}
              </span>
              {item.path === '/inbox' && unreadCount > 0 && (
                <span style={{ background: BRAND.PEACH, color: BRAND.PEACH_DARK, fontSize: 9, fontWeight: 800, borderRadius: 20, padding: '1px 7px' }}>
                  {unreadCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Channels */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.28)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>My Channels</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(SOURCE_META).map(([key]) => {
            const accessible = user?.role === 'admin' || myChannels.includes(key);
            if (!accessible) return null;
            return <PlatformLogo key={key} source={key} size={14} />;
          })}
        </div>
      </div>

      {/* User + logout */}
      <div title="Sign out" onClick={logout} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <Avatar name={user?.full_name} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'capitalize' }}>{user?.role} &bull; Sign out</div>
        </div>
      </div>
    </div>
  );
}
