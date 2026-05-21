// src/features/admin/Dashboard.jsx
import { useDashboard } from '../../hooks/useFetch';
import Loader, { ErrorMessage } from '../../components/Loader';
import { StatCard, Card, SectionTitle, PageTitle, PlatformLogo } from '../../components/UI.jsx';
import { BRAND, FONT, SOURCE_META } from '../../utils/constants';

export default function AdminDashboard() {
  const { data, loading, error } = useDashboard();
  if (loading) return <Loader />;
  if (error)   return <ErrorMessage message={error} />;
  const s   = data?.summary || {};
  const by  = data?.by_source || [];
  const agents = data?.agent_performance || [];
  const breaches = data?.sla_breaches || [];
  const csat = data?.csat || {};
  const avg  = data?.avg_response_minutes || 0;
  const max  = Math.max(...by.map(b => parseInt(b.count)), 1);
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', fontFamily: FONT }}>
      <PageTitle>Dashboard</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
        <StatCard label="Total Contacts" value={s.total_contacts} delta={`+${s.new_this_week||0} this week`} accentColor={BRAND.NAVY}/>
        <StatCard label="New Leads"      value={s.new_leads}      delta={`+${s.new_today||0} today`}        accentColor={BRAND.PEACH}/>
        <StatCard label="Qualified"      value={s.qualified}      accentColor="#3B82F6"/>
        <StatCard label="Converted"      value={s.converted}      accentColor="#10B981"/>
        <StatCard label="Avg CSAT"        value={csat.avg_csat?`${csat.avg_csat}/5`:'—'} accentColor="#F59E0B"/>
        <StatCard label="SLA Breaches"   value={breaches.length}  accentColor="#EF4444"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <SectionTitle>Leads by channel</SectionTitle>
          {by.map(b=>{const m=SOURCE_META[b.name]||{color:BRAND.NAVY};return(
            <div key={b.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:4,width:92,flexShrink:0,fontSize:10,color:BRAND.TEXT}}><PlatformLogo source={b.name} size={11}/>{m.label||b.name}</div>
              <div style={{flex:1,height:6,background:'#f0f4fa',borderRadius:6,overflow:'hidden'}}><div style={{width:`${(parseInt(b.count)/max)*100}%`,height:'100%',background:m.color,borderRadius:6}}/></div>
              <span style={{fontSize:10,color:BRAND.MUTED,width:22,textAlign:'right'}}>{b.count}</span>
            </div>
          );})}
        </Card>
        <Card>
          <SectionTitle>SLA breaches</SectionTitle>
          {breaches.length===0&&<div style={{color:'#10B981',fontSize:12,fontWeight:600}}>No active breaches</div>}
          {breaches.slice(0,5).map(b=>(
            <div key={b.conversation_id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f0f4fa'}}>
              <div><div style={{fontSize:11,fontWeight:700}}>{b.contact_name}</div><div style={{fontSize:9,color:BRAND.MUTED}}>{b.source} · {b.assigned_to||'Unassigned'}</div></div>
              <span style={{fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:'#fff0f0',color:'#ef4444',alignSelf:'center'}}>{Math.round(b.response_overdue_minutes)}m overdue</span>
            </div>
          ))}
          {breaches.length===0&&<div style={{marginTop:9,padding:'7px 10px',background:'#ecfdf5',borderRadius:6,fontSize:10,color:'#065f46',fontWeight:600}}>All conversations within SLA targets</div>}
        </Card>
      </div>
      <Card>
        <SectionTitle>Agent performance — last 30 days</SectionTitle>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead><tr>{['Agent','Total','Resolved','SLA met','Avg response','CSAT'].map(h=><th key={h} style={{textAlign:'left',color:BRAND.MUTED,fontWeight:600,padding:'4px 10px',borderBottom:'1px solid #f0f4fa',fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{agents.map(a=>(
            <tr key={a.agent_id}><td style={{padding:'6px 10px',fontWeight:700}}>{a.agent_name}</td><td style={{padding:'6px 10px'}}>{a.total_conversations}</td><td style={{padding:'6px 10px',color:'#10b981',fontWeight:700}}>{a.resolved}</td><td style={{padding:'6px 10px'}}>{a.sla_response_met}</td><td style={{padding:'6px 10px'}}>{a.avg_first_response_mins?`${a.avg_first_response_mins}m`:'—'}</td><td style={{padding:'6px 10px',color:'#f59e0b',fontWeight:700}}>{a.avg_csat||'—'}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}
