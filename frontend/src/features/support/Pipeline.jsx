// src/features/support/Pipeline.jsx
import { useState } from 'react';
import { useContacts } from '../../hooks/useFetch';
import { contactsAPI } from '../../api/users';
import { Avatar, SourceChip, DeptChip, PageTitle } from '../../components/UI.jsx';
import Loader, { ErrorMessage } from '../../components/Loader';
import { BRAND, FONT, PIPELINE_STAGES } from '../../utils/constants';

export default function Pipeline() {
  const { data, loading, error, reload } = useContacts({ limit:200 });
  const contacts = data?.contacts || [];
  const move = async (id, status) => { await contactsAPI.update(id,{status}); reload(); };
  if (loading) return <Loader/>;
  if (error)   return <ErrorMessage message={error}/>;
  return (
    <div style={{ padding:'20px 24px', overflowX:'auto', fontFamily:FONT }}>
      <PageTitle>Pipeline Board</PageTitle>
      <div style={{ display:'flex', gap:12, minWidth:700 }}>
        {PIPELINE_STAGES.filter(s=>s.key!=='closed').map(col=>{
          const cc = contacts.filter(c=>c.status===col.key);
          return (
            <div key={col.key} style={{ flex:1, minWidth:165 }}>
              <div style={{ background:col.color, color:'#fff', borderRadius:'10px 10px 0 0', padding:'9px 13px', fontSize:11, fontWeight:800, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {col.label}<span style={{ background:'rgba(255,255,255,.25)', borderRadius:20, padding:'1px 9px', fontSize:10 }}>{cc.length}</span>
              </div>
              <div style={{ background:'#f0f4fa', borderRadius:'0 0 10px 10px', padding:8, display:'flex', flexDirection:'column', gap:7, minHeight:180 }}>
                {cc.map(c=>(
                  <div key={c.id} style={{ background:'#fff', borderRadius:9, padding:'10px 11px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', borderLeft:`3px solid ${col.color}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}><Avatar name={c.full_name} size={24}/><span style={{ fontSize:11, fontWeight:700, color:BRAND.TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.full_name||'Unknown'}</span></div>
                    <div style={{ marginTop:6 }}><SourceChip source={c.primary_source} small/></div>
                    {c.department&&<div style={{ marginTop:3 }}><DeptChip dept={c.department}/></div>}
                    {c.salaampay_account&&<div style={{ fontSize:9, color:'#6366F1', marginTop:3 }}>{c.salaampay_account}</div>}
                    <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:8 }}>
                      {PIPELINE_STAGES.filter(cl=>cl.key!==col.key&&cl.key!=='closed').map(cl=>(
                        <button key={cl.key} onClick={()=>move(c.id,cl.key)} style={{ border:`1px solid ${cl.color}`, background:'transparent', color:cl.color, borderRadius:6, padding:'2px 7px', fontSize:8, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>{cl.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {cc.length===0&&<div style={{ textAlign:'center', color:'#ccc', fontSize:11, padding:'20px 0' }}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
