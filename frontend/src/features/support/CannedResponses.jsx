// src/features/support/CannedResponses.jsx
import { useState } from 'react';
import { useCanned } from '../../hooks/useFetch';
import { cannedAPI } from '../../api/issues';
import { PageTitle } from '../../components/UI.jsx';
import Button from '../../components/Form/Button.jsx';
import { Input, Textarea } from '../../components/Form/Input.jsx';
import Loader, { ErrorMessage, EmptyState } from '../../components/Loader';
import { BRAND, FONT } from '../../utils/constants';

export default function CannedResponses() {
  const { data, loading, error, reload } = useCanned();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', shortcut:'', body:'', is_shared:true });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const responses = (data?.canned_responses||[]).filter(r=>!search||(r.title+r.body).toLowerCase().includes(search.toLowerCase()));
  const handleCreate = async () => {
    if (!form.title||!form.body) return;
    setSaving(true);
    try { await cannedAPI.create(form); setShowForm(false); setForm({title:'',shortcut:'',body:'',is_shared:true}); reload(); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete this quick reply?')) return; await cannedAPI.delete(id); reload(); };
  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', fontFamily:FONT }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <PageTitle>Quick Replies</PageTitle>
        <Button onClick={()=>setShowForm(!showForm)}>{showForm?'Cancel':'+ New reply'}</Button>
      </div>
      {showForm&&(
        <div style={{ background:'#fff', borderRadius:14, padding:22, marginBottom:18, boxShadow:'0 2px 12px rgba(0,0,0,.08)', borderTop:`4px solid ${BRAND.PEACH}` }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:14 }}>
            <div style={{ flex:2, minWidth:180 }}><Input label="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Arabic Greeting" required/></div>
            <div style={{ flex:1, minWidth:120 }}><Input label="Shortcut (optional)" value={form.shortcut} onChange={e=>setForm(f=>({...f,shortcut:e.target.value}))} placeholder="/greet"/></div>
          </div>
          <Textarea label="Message body" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Type the reply template..." rows={4}/>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', fontFamily:FONT }}>
              <input type="checkbox" checked={form.is_shared} onChange={e=>setForm(f=>({...f,is_shared:e.target.checked}))}/>
              Share with all agents
            </label>
            <Button onClick={handleCreate} loading={saving} disabled={!form.title||!form.body}>Save reply</Button>
          </div>
        </div>
      )}
      <div style={{ marginBottom:16 }}><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quick replies..."/></div>
      {loading&&<Loader/>}
      {error&&<ErrorMessage message={error}/>}
      {!loading&&responses.length===0&&<EmptyState title="No quick replies yet" subtitle="Add your first one above"/>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {responses.map(r=>(
          <div key={r.id} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 6px rgba(0,0,0,.06)', display:'flex', gap:14 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:800, color:BRAND.NAVY }}>{r.title}</span>
                {r.shortcut&&<span style={{ background:'#eef3ff', color:BRAND.NAVY, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{r.shortcut}</span>}
                {r.is_shared&&<span style={{ background:'#ecfdf5', color:'#065f46', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Shared</span>}
                <span style={{ marginLeft:'auto', fontSize:10, color:'#bbb' }}>Used {r.use_count||0}x</span>
              </div>
              <div style={{ fontSize:12, color:'#555', lineHeight:1.55 }}>{r.body}</div>
            </div>
            <Button small variant="danger" onClick={()=>handleDelete(r.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
