// src/features/public/RaiseIssuePage.jsx — no login required
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BRAND, FONT, BANK_INFO } from '../../utils/constants';
import { Input, Textarea, Select } from '../../components/Form/Input.jsx';
import Button from '../../components/Form/Button.jsx';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ISSUE_TYPES = [
  { value: 'pending-transaction',           label: 'Pending Transaction'              },
  { value: 'failed-transaction',            label: 'Failed Transaction'               },
  { value: 'reversal-request',              label: 'Reversal Request'                 },
  { value: 'password-reset',                label: 'Password Reset'                   },
  { value: 'account-locked',               label: 'Account Locked'                   },
  { value: 'emurabaha-onboarding',          label: 'E-Murabaha Onboarding'            },
  { value: 'emurabaha-disbursement-delay',  label: 'E-Murabaha Disbursement Delay'    },
  { value: 'wallet-topup',                  label: 'Wallet Top-Up Issue'              },
  { value: 'wallet-withdrawal',             label: 'Wallet Withdrawal Issue'          },
  { value: 'app-crash',                     label: 'App Crash / Technical Issue'      },
  { value: 'account-opening',              label: 'Account Opening'                  },
  { value: 'asset-financing',              label: 'Asset Financing Enquiry'          },
  { value: 'house-financing',              label: 'House Financing Enquiry'          },
  { value: 'business-capital',             label: 'Business Capital Enquiry'         },
  { value: 'branch-enquiry',               label: 'Branch Enquiry'                   },
  { value: 'complaint',                    label: 'Formal Complaint'                 },
  { value: 'general-enquiry',              label: 'General Enquiry'                  },
];

export default function RaiseIssuePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', issue_type: '', message: '', opt_in: false });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())  e.full_name  = 'Full name is required';
    if (!form.email && !form.phone) e.email   = 'Email or phone number is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.issue_type)        e.issue_type = 'Please select an issue type';
    if (!form.message.trim())    e.message    = 'Please describe your issue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/webhooks/webform`, {
        full_name:    form.full_name,
        email:        form.email || undefined,
        phone:        form.phone || undefined,
        issue_type:   form.issue_type,
        message:      form.message,
        form_name:    'Customer Support Portal',
        page_url:     window.location.href,
      });
      navigate('/support/success');
    } catch {
      setErrors({ submit: 'Submission failed. Please try again or call us directly on ' + BANK_INFO.phones[0] });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: BRAND.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 44px', width: '100%', maxWidth: 540, boxShadow: '0 8px 40px rgba(0,0,0,.1)' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: BRAND.NAVY }}>{BANK_INFO.name.split(' ')[0]}</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginTop: 2 }}>{BANK_INFO.name.split(' ').slice(1).join(' ')}</div>
          <div style={{ fontSize: 10, color: '#bbb', marginTop: 4, fontStyle: 'italic' }}>{BANK_INFO.slogan}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.TEXT, marginTop: 20 }}>Submit a Support Request</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.55 }}>
            Our team will respond within your SLA window. For urgent issues, call <strong>{BANK_INFO.phones[0]}</strong> or visit your nearest branch.
          </div>
        </div>

        {errors.submit && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', color: '#C62828', fontSize: 13, marginBottom: 20 }}>{errors.submit}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full name" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" error={errors.full_name} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Email address" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" error={errors.email} />
            <Input label="Phone number"  type="tel"  value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
          </div>
          <Select label="Issue type" value={form.issue_type} onChange={e => set('issue_type', e.target.value)} options={ISSUE_TYPES} placeholder="Select issue type" error={errors.issue_type} />
          <Textarea label="Describe your issue" value={form.message} onChange={e => set('message', e.target.value)} placeholder="Please provide as much detail as possible, including any reference numbers or transaction IDs..." rows={4} error={errors.message} />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: '#555', cursor: 'pointer', lineHeight: 1.5 }}>
            <input type="checkbox" checked={form.opt_in} onChange={e => set('opt_in', e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            I consent to being contacted by Salaam Microfinance Bank regarding this request. View our privacy policy at {BANK_INFO.website}.
          </label>
        </div>

        <div style={{ marginTop: 24 }}>
          <Button onClick={submit} loading={loading} fullWidth style={{ padding: 13, fontSize: 14 }}>Submit Request</Button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 22, lineHeight: 1.6 }}>
          Branches: {BANK_INFO.branches.join(' &bull; ')}<br/>
          {BANK_INFO.phones.join(' &bull; ')} &bull; {BANK_INFO.website}
        </div>
      </div>
    </div>
  );
}
