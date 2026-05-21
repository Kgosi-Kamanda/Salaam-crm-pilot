// src/components/Form/Input.jsx
import { BRAND, FONT } from '../../utils/constants';

export function Input({ label, value, onChange, onKeyDown, placeholder, type = 'text', error, required, disabled, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: '#444', fontFamily: FONT }}>
          {label}{required && <span style={{ color: BRAND.PEACH, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled}
        style={{ padding: '9px 13px', borderRadius: 9, border: `1.5px solid ${error ? '#EF4444' : BRAND.BORDER}`, fontSize: 13, fontFamily: FONT, outline: 'none', background: disabled ? '#F5F5F5' : '#fff', width: '100%', boxSizing: 'border-box', color: BRAND.TEXT, ...style }}
      />
      {error && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: FONT }}>{error}</span>}
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3, error, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: '#444', fontFamily: FONT }}>{label}</label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ padding: '9px 13px', borderRadius: 9, border: `1.5px solid ${error ? '#EF4444' : BRAND.BORDER}`, fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box', resize: 'vertical', color: BRAND.TEXT, ...style }}
      />
      {error && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: FONT }}>{error}</span>}
    </div>
  );
}

export function Select({ label, value, onChange, options = [], placeholder, error, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: '#444', fontFamily: FONT }}>{label}</label>}
      <select value={value} onChange={onChange}
        style={{ padding: '9px 13px', borderRadius: 9, border: `1.5px solid ${error ? '#EF4444' : BRAND.BORDER}`, fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box', color: value ? BRAND.TEXT : '#999', ...style }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: FONT }}>{error}</span>}
    </div>
  );
}
