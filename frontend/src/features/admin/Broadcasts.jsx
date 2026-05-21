// src/features/admin/Broadcasts.jsx
// WhatsApp Broadcast Messaging — admin only
// Requires: opted-in contacts + Meta-approved templates
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { broadcastAPI } from '../../api/roles';
import { PageTitle, Card, SectionTitle, StatCard } from '../../components/UI.jsx';
import Button from '../../components/Form/Button.jsx';
import { Input, Textarea, Select } from '../../components/Form/Input.jsx';
import Loader, { ErrorMessage, EmptyState } from '../../components/Loader';
import { BRAND, FONT, BANK_INFO } from '../../utils/constants';

const STATUS_COLORS = {
  draft:      { bg: '#F0F4FA', color: '#555' },
  scheduled:  { bg: '#EFF6FF', color: '#1D4ED8' },
  sending:    { bg: '#FFFBEB', color: '#92400E' },
  sent:       { bg: '#ECFDF5', color: '#065F46' },
  cancelled:  { bg: '#F5F5F5', color: '#888' },
  failed:     { bg: '#FFF0F0', color: '#C62828' },
};

const APPROVAL_COLORS = {
  pending:  { bg: '#FFFBEB', color: '#92400E' },
  approved: { bg: '#ECFDF5', color: '#065F46' },
  rejected: { bg: '#FFF0F0', color: '#C62828' },
};

export default function Broadcasts() {
  const { data: tmplData, loading: tLoading, error: tError, reload: reloadTmpls } = useFetch(() => broadcastAPI.templates(), []);
  const { data: bcastData, loading: bLoading, reload: reloadBcasts } = useFetch(() => broadcastAPI.list(), []);
  const [tab,       setTab]       = useState('broadcasts'); // broadcasts | templates
  const [showForm,  setShowForm]  = useState(false);
  const [showTmpl,  setShowTmpl]  = useState(false);
  const [sending,   setSending]   = useState(null);
  const [formErr,   setFormErr]   = useState('');

  // Broadcast form
  const [bForm, setBForm] = useState({ template_id: '', name: '', audience_filter: { status: '', department: '', branch: '' }, scheduled_at: '' });
  // Template form
  const [tForm, setTForm] = useState({ name: '', category: 'utility', language: 'en', body_text: '', header_text: '', footer_text: '', meta_template_name: '', requires_opt_in: true });

  const templates  = tmplData?.templates  || [];
  const broadcasts = bcastData?.broadcasts || [];

  const createTemplate = async () => {
    if (!tForm.name.trim() || !tForm.body_text.trim()) { setFormErr('Name and body text are required'); return; }
    try {
      await broadcastAPI.createTemplate(tForm);
      setShowTmpl(false); setTForm({ name:'', category:'utility', language:'en', body_text:'', header_text:'', footer_text:'', meta_template_name:'', requires_opt_in:true });
      reloadTmpls(); setFormErr('');
    } catch (e) { setFormErr(e.response?.data?.error || 'Failed to create template'); }
  };

  const createBroadcast = async () => {
    if (!bForm.template_id || !bForm.name.trim()) { setFormErr('Template and broadcast name are required'); return; }
    try {
      const res = await broadcastAPI.create(bForm);
      setShowForm(false); setBForm({ template_id:'', name:'', audience_filter:{}, scheduled_at:'' });
      reloadBcasts(); setFormErr('');
      alert(`Broadcast created. Estimated audience: ${res.data.audience_count} opted-in contacts.`);
    } catch (e) { setFormErr(e.response?.data?.error || 'Failed to create broadcast'); }
  };

  const sendBroadcast = async (id, name) => {
    if (!window.confirm(`Send broadcast "${name}" now? This will message opted-in customers immediately.`)) return;
    setSending(id);
    try {
      const res = await broadcastAPI.send(id);
      reloadBcasts();
      alert(`Broadcast sent. ${res.data.sent_count} sent, ${res.data.failed_count} failed.`);
    } catch (e) { alert('Send failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSending(null); }
  };

  const cancelBroadcast = async (id) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    await broadcastAPI.cancel(id, reason);
    reloadBcasts();
  };

  const approveTemplate = async (id, status) => {
    await broadcastAPI.updateApproval(id, { approval_status: status, meta_approved_at: status === 'approved' ? new Date().toISOString() : null });
    reloadTmpls();
  };

  const f = FONT;
  const n = BRAND.NAVY;

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', fontFamily: f }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <PageTitle>WhatsApp Broadcasts</PageTitle>
          <div style={{ fontSize: 12, color: BRAND.MUTED, marginTop: -10, marginBottom: 14, maxWidth: 600 }}>
            Send template-based WhatsApp messages to opted-in customers. All broadcasts require a Meta-approved template and only reach contacts with <strong>opted_in_whatsapp = true</strong>. Marketing messages require explicit customer opt-in per Kenya Data Protection Act 2019.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="ghost" small onClick={() => { setShowTmpl(!showTmpl); setShowForm(false); }}>+ New template</Button>
          <Button small onClick={() => { setShowForm(!showForm); setShowTmpl(false); }}>+ New broadcast</Button>
        </div>
      </div>

      {/* Legal notice */}
      <div style={{ background: BRAND.PEACH_BG, border: `1px solid ${BRAND.PEACH}`, borderRadius: 10, padding: '11px 16px', marginBottom: 16, fontSize: 11, color: BRAND.PEACH_DARK, lineHeight: 1.6 }}>
        <strong>Compliance:</strong> Broadcasts are restricted to customers who have explicitly opted in. Marketing templates require Meta approval before use. Customers can opt out at any time by replying STOP. Salaam Microfinance Bank complies with the Kenya Data Protection Act 2019 and WhatsApp Business Policy.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['broadcasts','templates'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f, textTransform: 'capitalize', background: tab===t ? n : '#f0f4fa', color: tab===t ? '#fff' : '#888' }}>{t}</button>
        ))}
      </div>

      {/* New Template form */}
      {showTmpl && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,.08)', borderTop: `4px solid ${BRAND.PEACH}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: n, marginBottom: 14 }}>New WhatsApp Template</div>
          {formErr && <div style={{ color: '#C62828', fontSize: 12, marginBottom: 12 }}>{formErr}</div>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 2, minWidth: 180 }}><Input label="Template name (internal)" value={tForm.name} onChange={e => setTForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select label="Category" value={tForm.category} onChange={e => setTForm(f => ({...f, category: e.target.value}))}
                options={['marketing','utility','transactional','authentication'].map(v => ({ value: v, label: v.charAt(0).toUpperCase()+v.slice(1) }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Input label="Meta template name (exact)" value={tForm.meta_template_name} onChange={e => setTForm(f => ({...f, meta_template_name: e.target.value}))} placeholder="e.g. salaam_welcome_v1" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><Input label="Header (optional)" value={tForm.header_text} onChange={e => setTForm(f => ({...f, header_text: e.target.value}))} placeholder="Short header text" /></div>
          <div style={{ marginBottom: 12 }}><Textarea label="Body text" value={tForm.body_text} onChange={e => setTForm(f => ({...f, body_text: e.target.value}))} placeholder="Use {{1}}, {{2}} for variables. e.g. As-salamu alaykum {{1}}, your E-Murabaha limit has been updated." rows={4} required /></div>
          <div style={{ marginBottom: 16 }}><Input label="Footer (optional)" value={tForm.footer_text} onChange={e => setTForm(f => ({...f, footer_text: e.target.value}))} placeholder={`${BANK_INFO.name} — ${BANK_INFO.slogan}`} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={createTemplate}>Save Template</Button>
            <Button variant="secondary" onClick={() => setShowTmpl(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* New Broadcast form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,.08)', borderTop: `4px solid ${n}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: n, marginBottom: 14 }}>New Broadcast</div>
          {formErr && <div style={{ color: '#C62828', fontSize: 12, marginBottom: 12 }}>{formErr}</div>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 2, minWidth: 200 }}><Input label="Broadcast name (internal)" value={bForm.name} onChange={e => setBForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Select label="Template" value={bForm.template_id} onChange={e => setBForm(f => ({...f, template_id: e.target.value}))}
                options={templates.filter(t => t.approval_status === 'approved').map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select approved template" />
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 10 }}>Audience filters (all opted-in WhatsApp contacts)</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select label="Contact status" value={bForm.audience_filter.status} onChange={e => setBForm(f => ({...f, audience_filter: {...f.audience_filter, status: e.target.value}}))}
                options={['new','contacted','qualified','converted'].map(v => ({value:v, label: v.charAt(0).toUpperCase()+v.slice(1)}))} placeholder="All statuses" />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select label="Department" value={bForm.audience_filter.department} onChange={e => setBForm(f => ({...f, audience_filter: {...f.audience_filter, department: e.target.value}}))}
                options={['Social Media','SalaamPay Support','Bank Accounts'].map(v => ({value:v, label:v}))} placeholder="All departments" />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select label="Branch" value={bForm.audience_filter.branch} onChange={e => setBForm(f => ({...f, audience_filter: {...f.audience_filter, branch: e.target.value}}))}
                options={BANK_INFO.branches.map(v => ({value:v, label:v}))} placeholder="All branches" />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Input label="Schedule (optional)" type="datetime-local" value={bForm.scheduled_at} onChange={e => setBForm(f => ({...f, scheduled_at: e.target.value}))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={createBroadcast}>Create Broadcast</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Broadcasts tab */}
      {tab === 'broadcasts' && (
        <>
          {bLoading && <Loader />}
          {!bLoading && broadcasts.length === 0 && <EmptyState title="No broadcasts yet" subtitle="Create your first WhatsApp broadcast above" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {broadcasts.map(b => {
              const sc = STATUS_COLORS[b.status] || STATUS_COLORS.draft;
              const sentPct  = b.audience_count > 0 ? Math.round((b.sent_count/b.audience_count)*100) : 0;
              const readPct  = b.sent_count > 0      ? Math.round((b.read_count/b.sent_count)*100)    : 0;
              return (
                <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: n }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: BRAND.MUTED, marginTop: 2 }}>Template: {b.template_name} &bull; Category: {b.category} &bull; Created {new Date(b.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ ...sc, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{b.status}</span>
                      {['draft','scheduled'].includes(b.status) && (
                        <>
                          <Button small onClick={() => sendBroadcast(b.id, b.name)} loading={sending === b.id}>Send Now</Button>
                          <Button small variant="danger" onClick={() => cancelBroadcast(b.id)}>Cancel</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {b.status !== 'draft' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, marginTop: 10 }}>
                      {[
                        { l: 'Audience', v: b.audience_count, c: n },
                        { l: 'Sent',     v: b.sent_count,     c: '#3B82F6' },
                        { l: 'Delivered',v: b.delivered_count, c: '#10B981' },
                        { l: 'Read',     v: b.read_count,      c: '#F59E0B' },
                        { l: 'Failed',   v: b.failed_count,    c: '#EF4444' },
                      ].map(s => (
                        <div key={s.l} style={{ background: '#f8faff', borderRadius: 9, padding: '10px 12px', borderTop: `3px solid ${s.c}` }}>
                          <div style={{ fontSize: 9, color: BRAND.MUTED, fontWeight: 500 }}>{s.l}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.c, marginTop: 3 }}>{s.v || 0}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <>
          {tLoading && <Loader />}
          {tError   && <ErrorMessage message={tError} />}
          {!tLoading && templates.length === 0 && <EmptyState title="No templates yet" subtitle="Create a WhatsApp message template above" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.map(t => {
              const ac = APPROVAL_COLORS[t.approval_status] || APPROVAL_COLORS.pending;
              return (
                <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,.06)', display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: n }}>{t.name}</span>
                      <span style={{ background: '#f0f4fa', color: '#555', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>{t.category}</span>
                      <span style={{ ...ac, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>{t.approval_status}</span>
                      {t.meta_template_name && <span style={{ background: '#eef3ff', color: n, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{t.meta_template_name}</span>}
                    </div>
                    {t.header_text && <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 4 }}>{t.header_text}</div>}
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.55 }}>{t.body_text}</div>
                    {t.footer_text && <div style={{ fontSize: 11, color: BRAND.MUTED, marginTop: 4, fontStyle: 'italic' }}>{t.footer_text}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {t.approval_status !== 'approved' && (
                      <Button small variant="success" onClick={() => approveTemplate(t.id, 'approved')}>Mark Approved</Button>
                    )}
                    {t.approval_status === 'approved' && (
                      <Button small variant="secondary" onClick={() => approveTemplate(t.id, 'pending')}>Reset Status</Button>
                    )}
                    <Button small variant="danger" onClick={() => approveTemplate(t.id, 'rejected')}>Mark Rejected</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
