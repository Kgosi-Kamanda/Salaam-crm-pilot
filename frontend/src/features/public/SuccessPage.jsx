// src/features/public/SuccessPage.jsx
import { useNavigate } from 'react-router-dom';
import { BRAND, FONT, BANK_INFO } from '../../utils/constants';
import Button from '../../components/Form/Button.jsx';

export default function SuccessPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: BRAND.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 44px', width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,.1)', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.NAVY, marginBottom: 10 }}>Request Submitted</div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 10 }}>
          JazakAllah Khayr! Your support request has been received by {BANK_INFO.name}. Our team will contact you within your SLA window.
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 28, lineHeight: 1.55 }}>
          For urgent matters, please call <strong style={{ color: BRAND.NAVY }}>{BANK_INFO.phones[0]}</strong> or visit one of our branches: {BANK_INFO.branches.join(', ')}.
        </div>
        <Button onClick={() => navigate('/support')} variant="ghost">Submit Another Request</Button>
        <div style={{ marginTop: 20, fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>{BANK_INFO.slogan}</div>
      </div>
    </div>
  );
}
