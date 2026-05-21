// src/components/Form/Button.jsx
import { BRAND, FONT } from '../../utils/constants';

const VARIANTS = {
  primary:   { background: BRAND.NAVY,     color: '#fff',           border: 'none' },
  secondary: { background: '#F0F4FA',       color: '#555',           border: 'none' },
  ghost:     { background: 'transparent',   color: BRAND.NAVY,       border: `1.5px solid ${BRAND.NAVY}` },
  peach:     { background: BRAND.PEACH_BG,  color: BRAND.PEACH_DARK, border: 'none' },
  danger:    { background: '#FFF0F0',       color: '#C62828',        border: 'none' },
  success:   { background: '#ECFDF5',       color: '#065F46',        border: 'none' },
  warning:   { background: '#FFFBEB',       color: '#92400E',        border: 'none' },
};

export default function Button({ children, onClick, variant = 'primary', small, disabled, loading, fullWidth, style = {}, type = 'button' }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{
        ...v, borderRadius: 9, padding: small ? '5px 12px' : '9px 18px',
        fontSize: small ? 11 : 13, fontWeight: 700,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        fontFamily: FONT, opacity: (disabled || loading) ? 0.55 : 1,
        transition: 'opacity 0.15s',
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        ...style,
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
