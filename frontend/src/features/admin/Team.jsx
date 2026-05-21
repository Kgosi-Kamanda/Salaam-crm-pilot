// src/features/admin/Team.jsx
import { useState } from 'react';
import { useTeam, useDepartments } from '../../hooks/useFetch';
import { teamAPI } from '../../api/users';
import { Avatar, RoleBadge, ActiveBadge, DeptChip, PlatformLogo, PageTitle, TableHead } from '../../components/UI.jsx';
import Button from '../../components/Form/Button.jsx';
import { Input, Select } from '../../components/Form/Input.jsx';
import Loader, { ErrorMessage } from '../../components/Loader';
import { BRAND, FONT, SOURCE_META } from '../../utils/constants';

export default function Team() {
  const { data: teamData, loading, error, reload } = useTeam();
  const { data: deptData } = useDepartments();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', password:'', role:'agent', channels:[], department_ids:[] });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const members = teamData?.team || [];
  const depts   = deptData?.departments || [];

  const handleAdd = async () => {
    if (!form.full_name||!form.email||!form.password) { setFormErr('Full name, email and password are required'); return; }
    if (form.password.length < 10) { setFormErr('Password must be at least 10 characters'); return; }
    setSaving(true); setFormErr('');
    try { await teamAPI.create(form); setShowForm(false); reload(); setForm({full_name:'',email:'',password:'',role:'agent',channels:[],department_ids:[]}); }
    catch(e) { setFormErr(e.response?.data?.error||'Failed to add member'); }
    finally { setSaving(false); }
  };
  const toggleActive = async (id, is_active) => { await teamAPI.update(id,{is_active:!is_active}); reload(); };
  const toggleCh = (p) => setForm(f=>({...f, channels: f.channels.includes(p)?f.channels.filter(c=>c!==p):[...f.channels,p]}));
  const toggleDept=(id)=> setForm(f=>({...f, department_ids: f.department_ids.includes(id)?f.department_ids.filter(d=>d!==id):[...f.department_ids,id]}));

  if (loading) return <Loader/>;
  if (error)   return <ErrorMessage message={error}/>;

  return (
    <div style={{padding:'20px 24px',overflowY:'auto',fontFamily:FONT}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <PageTitle>Team Members</PageTitle>
        <Button onClick={()=>setShowForm(!showForm)}>{showForm?'Cancel':'+ Add member'}</Button>
      </div>
      {showForm&&(
        <div style={{background:'#fff',borderRadius:14,padding:22,marginBottom:20,boxShadow:'0 2px 12px rgba(0,0,0,.08)',borderTop:`4px solid ${BRAND.PEACH}`}}>
          {formErr&&<div style={{color:'#C62828',fontSize:12,marginBottom:12}}>{formErr}</div>}
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:14}}>
            <div style={{flex:1,minWidth:170}}><Input label="Full name" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/></div>
            <div style={{flex:1,minWidth:170}}><Input label="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/></div>
            <div style={{flex:1,minWidth:150}}><Input label="Password (min 10 chars)" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/></div>
            <div style={{width:130}}><Select label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} options={['admin','agent','viewer'].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))}/></div>
          </div>
          <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:'#555',marginBottom:8}}>Channel access</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {Object.entries(SOURCE_META).map(([key,m])=>(
                <button key={key} onClick={()=>toggleCh(key)} style={{padding:'5px 12px',borderRadius:20,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,display:'inline-flex',alignItems:'center',gap:5,background:form.channels.includes(key)?BRAND.NAVY:'#f0f4fa',color:form.channels.includes(key)?'#fff':'#888'}}>
                  <PlatformLogo source={key} size={11}/>{m.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:18}}><div style={{fontSize:11,fontWeight:700,color:'#555',marginBottom:8}}>Department access</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {depts.map(d=><button key={d.id} onClick={()=>toggleDept(d.id)} style={{padding:'5px 14px',borderRadius:20,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,background:form.department_ids.includes(d.id)?d.color:'#f0f4fa',color:form.department_ids.includes(d.id)?'#fff':'#888'}}>{d.name}</button>)}
            </div>
          </div>
          <Button onClick={handleAdd} loading={saving}>Add Member</Button>
        </div>
      )}
      <div style={{background:'#fff',borderRadius:14,boxShadow:'0 2px 12px rgba(0,0,0,.06)',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <TableHead cols={['Member','Role','Channels','Departments','Status','Actions']}/>
          <tbody>{members.map((m,i)=>(
            <tr key={m.id} style={{borderBottom:'1px solid #f0f4fa',background:i%2===0?'#fff':'#fafbff'}}>
              <td style={{padding:'11px 14px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={m.full_name} size={28}/><div><div style={{fontSize:12,fontWeight:700}}>{m.full_name}</div><div style={{fontSize:10,color:BRAND.MUTED}}>{m.email}</div></div></div></td>
              <td style={{padding:'11px 14px'}}><RoleBadge role={m.role}/></td>
              <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>{(m.channels||[]).map(ch=><PlatformLogo key={ch} source={ch} size={14}/>)}</div></td>
              <td style={{padding:'11px 14px'}}><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{(m.departments||[]).map(d=><DeptChip key={d.id} dept={d.name}/>)}</div></td>
              <td style={{padding:'11px 14px'}}><ActiveBadge active={m.is_active}/></td>
              <td style={{padding:'11px 14px'}}><Button small variant={m.is_active?'danger':'success'} onClick={()=>toggleActive(m.id,m.is_active)}>{m.is_active?'Deactivate':'Activate'}</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
