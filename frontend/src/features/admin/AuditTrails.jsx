// src/features/admin/AuditTrails.jsx
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { rolesAPI } from '../../api/roles';
import { Avatar, PageTitle } from '../../components/UI.jsx';
import Loader, { ErrorMessage, EmptyState } from '../../components/Loader';
import { Input, Select } from '../../components/Form/Input.jsx';
import { BRAND, FONT } from '../../utils/constants';

const COLORS={
  status_changed:{bg:'#EFF6FF',tc:'#1D4ED8'},contact_created:{bg:'#ECFDF5',tc:'#065F46'},
  tag_added:{bg:'#EEF3FF',tc:BRAND.NAVY},message_sent:{bg:'#F5F3FF',tc:'#5B21B6'},
  note_added:{bg:'#FFFBEB',tc:'#92400E'},conversation_resolved:{bg:'#ECFDF5',tc:'#065F46'},
  conversation_assigned:{bg:'#FFF4E6',tc:'#B45309'},sla_breached:{bg:'#FFF0F0',tc:'#C62828'},
  csat_received:{bg:'#FFFBEB',tc:'#92400E'},login:{bg:'#EFF6FF',tc:'#1D4ED8'},
  logout:{bg:'#F5F5F5',tc:'#555'},password_changed:{bg:'#ECFDF5',tc:'#065F46'},
  member_created:{bg:'#EEF3FF',tc:BRAND.NAVY},broadcast_sent:{bg:'#F0EEFF',tc:'#6366F1'},
};
const LABELS={
  status_changed:'Status changed',contact_created:'Contact created',tag_added:'Tag added',
  message_sent:'Message sent',note_added:'Note added',conversation_resolved:'Resolved',
  conversation_assigned:'Assigned',sla_breached:'SLA breached',csat_received:'CSAT received',
  login:'Login',logout:'Logout',password_changed:'Password changed',member_created:'Member created',
  broadcast_sent:'Broadcast sent',contact_blacklisted:'Contact removed',opt_in_recorded:'Opt-in recorded',
};

export default function AuditTrails() {
  const [search, setSearch]   = useState('');
  const [action, setAction]   = useState('');
  const [page,   setPage]     = useState(1);
  const params = { page, limit: 50, ...(action&&{action}), ...(search&&{search}) };
  const { data, loading, error } = useFetch(() => rolesAPI.auditLog(params), [JSON.stringify(params)]);
  const logs = data?.logs || [];
  const total= data?.total || 0;
  const actionOpts = Object.entries(LABELS).map(([v,l])=>({value:v,label:l}));

  return (
    <div style={{padding:'20px 24px',overflowY:'auto',fontFamily:FONT}}>
      <PageTitle>Audit Trail</PageTitle>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:220}}><Input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by team member or contact..."/></div>
        <div style={{width:200}}><Select value={action} onChange={e=>{setAction(e.target.value);setPage(1);}} options={actionOpts} placeholder="All actions"/></div>
      </div>
      {loading&&<Loader/>}
      {error&&<ErrorMessage message={error}/>}
      {!loading&&logs.length===0&&<EmptyState title="No audit logs found"/>}
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 10px rgba(0,0,0,.06)',overflow:'hidden'}}>
        {logs.map((log,i)=>{
          const s=COLORS[log.action]||{bg:'#f5f5f5',tc:'#555'};
          const l=LABELS[log.action]||log.action;
          const det=log.details?(typeof log.details==='string'?JSON.parse(log.details):log.details):{};
          return(
            <div key={log.id} style={{display:'flex',gap:11,padding:'11px 16px',alignItems:'flex-start',background:i%2===0?'#fff':'#FAFBFF',borderBottom:'1px solid #f0f4fa'}}>
              <Avatar name={log.team_member_name||'System'} size={30}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,fontWeight:700}}>{log.team_member_name||'System'}</span>
                  <span style={{background:s.bg,color:s.tc,fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20}}>{l}</span>
                  {log.contact_name&&<span style={{fontSize:10,color:BRAND.MUTED}}>on {log.contact_name}</span>}
                </div>
                {det.from&&det.to&&<div style={{fontSize:10,color:BRAND.MUTED,marginTop:2}}>{det.from} &rarr; {det.to}</div>}
              </div>
              <div style={{fontSize:9,color:BRAND.MUTED,flexShrink:0}}>{new Date(log.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
      {total>50&&(
        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16}}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${BRAND.BORDER}`,background:'#fff',cursor:page===1?'not-allowed':'pointer',fontFamily:FONT,fontSize:12}}>Previous</button>
          <span style={{padding:'6px 14px',fontSize:12,color:BRAND.MUTED,fontFamily:FONT}}>Page {page} of {Math.ceil(total/50)}</span>
          <button disabled={page>=Math.ceil(total/50)} onClick={()=>setPage(p=>p+1)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${BRAND.BORDER}`,background:'#fff',cursor:page>=Math.ceil(total/50)?'not-allowed':'pointer',fontFamily:FONT,fontSize:12}}>Next</button>
        </div>
      )}
    </div>
  );
}
