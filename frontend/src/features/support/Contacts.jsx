// src/features/support/Contacts.jsx
import { useState } from 'react';
import { useContacts } from '../../hooks/useFetch';
import { contactsAPI } from '../../api/users';
import { Avatar, SourceChip, DeptChip, StatusBadge, PageTitle, TableHead } from '../../components/UI.jsx';
import Button from '../../components/Form/Button.jsx';
import { Input, Select } from '../../components/Form/Input.jsx';
import Loader, { ErrorMessage, EmptyState } from '../../components/Loader';
import { BRAND, FONT } from '../../utils/constants';

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const params = { page, limit:50, ...(search&&{search}), ...(status&&{status}) };
  const { data, loading, error, reload } = useContacts(params);
  const contacts = data?.contacts || [];
  const total    = data?.total    || 0;
  const statusOpts = ['new','contacted','qualified','converted','closed'].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}));
  const updateStatus = async (id, newStatus) => { await contactsAPI.update(id,{status:newStatus}); reload(); };
  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', fontFamily:FONT }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <PageTitle>Contacts <span style={{ fontSize:13, color:'#aaa', fontWeight:400 }}>({total})</span></PageTitle>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:220 }}><Input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search name, email, phone, SalaamPay account..."/></div>
        <div style={{ width:180 }}><Select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} options={statusOpts} placeholder="All statuses"/></div>
      </div>
      {loading && <Loader/>}
      {error   && <ErrorMessage message={error}/>}
      {!loading && contacts.length===0 && <EmptyState title="No contacts found" subtitle="Adjust your search or filters"/>}
      {!loading && contacts.length>0 && (
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <TableHead cols={['Customer','Channel','Department','Status','SalaamPay','Last active','Actions']}/>
            <tbody>
              {contacts.map((c,i)=>(
                <tr key={c.id} style={{ borderBottom:'1px solid #f0f4fa', background:i%2===0?'#fff':'#fafbff' }}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <Avatar name={c.full_name} size={28}/>
                      <div><div style={{ fontSize:12, fontWeight:700 }}>{c.full_name||'Unknown'}</div>{c.email&&<div style={{ fontSize:10, color:BRAND.MUTED }}>{c.email}</div>}{c.phone&&<div style={{ fontSize:10, color:BRAND.MUTED }}>{c.phone}</div>}</div>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px' }}>{c.primary_source&&<SourceChip source={c.primary_source} small/>}</td>
                  <td style={{ padding:'10px 14px' }}>{c.department&&<DeptChip dept={c.department}/>}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <select value={c.status} onChange={e=>updateStatus(c.id,e.target.value)} style={{ border:'none', background:'transparent', fontFamily:FONT, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      {statusOpts.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:10, color:'#6366F1', fontWeight:600 }}>{c.salaampay_account||'—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:10, color:BRAND.MUTED }}>{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td style={{ padding:'10px 14px' }}><Button small variant="secondary">View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total>50&&(
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16 }}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${BRAND.BORDER}`, background:'#fff', cursor:page===1?'not-allowed':'pointer', fontFamily:FONT, fontSize:12 }}>Previous</button>
          <span style={{ padding:'6px 14px', fontSize:12, color:BRAND.MUTED }}>Page {page} of {Math.ceil(total/50)}</span>
          <button disabled={page>=Math.ceil(total/50)} onClick={()=>setPage(p=>p+1)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${BRAND.BORDER}`, background:'#fff', cursor:page>=Math.ceil(total/50)?'not-allowed':'pointer', fontFamily:FONT, fontSize:12 }}>Next</button>
        </div>
      )}
    </div>
  );
}
