// src/features/admin/Roles.jsx
import { useState } from 'react';
import { useTeam, useDepartments } from '../../hooks/useFetch';
import { teamAPI } from '../../api/users';
import { Avatar, RoleBadge, ActiveBadge, DeptChip, PlatformLogo, PageTitle, TableHead } from '../../components/UI.jsx';
import Button from '../../components/Form/Button.jsx';
import Loader, { ErrorMessage } from '../../components/Loader';
import { BRAND, FONT, SOURCE_META } from '../../utils/constants';

export default function Roles() {
  const { data: teamData, loading, error, reload } = useTeam();
  const { data: deptData } = useDepartments();
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ role:'agent', channels:[], department_ids:[] });
  const [saving, setSaving]     = useState(false);
  const members = teamData?.team || [];
  const depts   = deptData?.departments || [];
  const startEdit = (m) => { setEditing(m.id); setForm({ role:m.role, channels:m.channels||[], department_ids:(m.departments||[]).map(d=>d.id) }); };
  const save = async () => {
    setSaving(true);
    try { await teamAPI.update(editing, form); reload(); setEditing(null); }
    finally { setSaving(false); }
  };
  const toggleCh   = (p)  => setForm(f=>({...f,channels:         f.channels.includes(p)?f.channels.filter(c=>c!==p):[...f.channels,p]}));
  const toggleDept = (id) => setForm(f=>({...f,department_ids:   f.department_ids.includes(id)?f.department_ids.filter(d=>d!==id):[...f.department_ids,id]}));
  if (loading) return <Loader/>;
  if (error)   return <ErrorMessage message={error}/>;
  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', fontFamily:FONT }}>
      <PageTitle>Roles &amp; Access Control</PageTitle>
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden', marginBottom:20 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <TableHead cols={['Member','Role','Channel access','Departments','Status','Actions']}/>
          <tbody>{members.map((m,i)=>(
            <tr key={m.id} style={{ borderBottom:'1px solid #f0f4fa', background:i%2===0?'#fff':'#fafbff' }}>
              <td style={{ padding:'11px 14px' }}><div style={{ display:'flex', alignItems:'center', gap:9 }}><Avatar name={m.full_name} size={28}/><div><div style={{ fontSize:12, fontWeight:700 }}>{m.full_name}</div><div style={{ fontSize:10, color:BRAND.MUTED }}>{m.email}</div></div></div></td>
              <td style={{ padding:'11px 14px' }}><RoleBadge role={m.role}/></td>
              <td style={{ padding:'11px 14px' }}><div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>{(m.channels||[]).map(ch=><PlatformLogo key={ch} source={ch} size={14}/>)}</div></td>
              <td style={{ padding:'11px 14px' }}><div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>{(m.departments||[]).map(d=><DeptChip key={d.id} dept={d.name}/>)}</div></td>
              <td style={{ padding:'11px 14px' }}><ActiveBadge active={m.is_active}/></td>
              <td style={{ padding:'11px 14px' }}><Button small variant="ghost" onClick={()=>startEdit(m)}>Edit Access</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing&&(
        <div style={{ background:'#fff', borderRadius:14, padding:22, boxShadow:'0 2px 12px rgba(0,0,0,.08)', borderTop:`4px solid ${BRAND.PEACH}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:BRAND.NAVY, marginBottom:16 }}>Edit access — {members.find(m=>m.id===editing)?.full_name}</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:8 }}>Role</div>
            <div style={{ display:'flex', gap:6 }}>
              {['admin','agent','viewer'].map(r=>(
                <button key={r} onClick={()=>setForm(f=>({...f,role:r}))} style={{ padding:'5px 14px', borderRadius:20, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:FONT, textTransform:'capitalize', background:form.role===r?BRAND.NAVY:'#f0f4fa', color:form.role===r?'#fff':'#888' }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:8 }}>Channel access</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {Object.entries(SOURCE_META).map(([key,m])=>(
                <button key={key} onClick={()=>toggleCh(key)} style={{ padding:'5px 12px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, display:'inline-flex', alignItems:'center', gap:4, background:form.channels.includes(key)?BRAND.NAVY:'#f0f4fa', color:form.channels.includes(key)?'#fff':'#888' }}>
                  <PlatformLogo source={key} size={11}/>{m.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:8 }}>Department access</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {depts.map(d=>(
                <button key={d.id} onClick={()=>toggleDept(d.id)} style={{ padding:'5px 14px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, background:form.department_ids.includes(d.id)?d.color:'#f0f4fa', color:form.department_ids.includes(d.id)?'#fff':'#888' }}>{d.name}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Button onClick={save} loading={saving}>Save Changes</Button>
            <Button variant="secondary" onClick={()=>setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
