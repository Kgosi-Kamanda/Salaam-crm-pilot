// src/features/admin/Reports.jsx
import { useDashboard } from '../../hooks/useFetch';
import Loader, { ErrorMessage } from '../../components/Loader';
import { Card, SectionTitle, PageTitle, PlatformLogo } from '../../components/UI.jsx';
import { BRAND, FONT, SOURCE_META } from '../../utils/constants';

export default function Reports() {
  const { data, loading, error } = useDashboard();
  if (loading) return <Loader />;
  if (error)   return <ErrorMessage message={error} />;
  const s=data?.summary||{}, by=data?.by_source||[], agents=data?.agent_performance||[], csat=data?.csat||{}, avg=data?.avg_response_minutes||0;
  const funnel=[{l:'New',v:s.new_leads,c:BRAND.NAVY},{l:'Contacted',v:s.contacted,c:'#F59E0B'},{l:'Qualified',v:s.qualified,c:'#3B82F6'},{l:'Converted',v:s.converted,c:'#10B981'}];
  const max=Math.max(...by.map(b=>parseInt(b.count)),1);
  return (
    <div style={{padding:'20px 24px',overflowY:'auto',fontFamily:FONT}}>
      <PageTitle>Reports</PageTitle>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:14}}>
        {[{l:'Total contacts',v:s.total_contacts,c:BRAND.NAVY},{l:'Avg response',v:`${avg}m`,c:'#6366F1'},{l:'Avg CSAT',v:csat.avg_csat?`${csat.avg_csat}/5`:'—',c:'#F59E0B'},{l:'CSAT responses',v:csat.total_csat,c:'#10B981'}].map(k=>(
          <div key={k.l} style={{background:'#fff',borderRadius:11,padding:'13px 14px',borderLeft:`4px solid ${k.c}`,boxShadow:'0 1px 5px rgba(0,0,0,.05)'}}>
            <div style={{fontSize:10,color:BRAND.MUTED,fontWeight:500}}>{k.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:BRAND.NAVY,marginTop:4}}>{k.v??'—'}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Card><SectionTitle>Pipeline funnel</SectionTitle>
          {funnel.map(f=>{const p=s.total_contacts?Math.round((f.v/s.total_contacts)*100):0;return(
            <div key={f.l} style={{marginBottom:11}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:11,fontWeight:600}}>{f.l}</span><span style={{fontSize:11,color:BRAND.MUTED}}>{f.v||0} ({p}%)</span></div>
              <div style={{height:8,background:'#f0f4fa',borderRadius:8,overflow:'hidden'}}><div style={{width:`${p}%`,height:'100%',background:f.c,borderRadius:8}}/></div>
            </div>
          );})}
        </Card>
        <Card><SectionTitle>Channel breakdown</SectionTitle>
          {by.map(b=>{const m=SOURCE_META[b.name]||{color:BRAND.NAVY};return(
            <div key={b.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:4,width:92,flexShrink:0,fontSize:10}}><PlatformLogo source={b.name} size={11}/>{m.label||b.name}</div>
              <div style={{flex:1,height:6,background:'#f0f4fa',borderRadius:6,overflow:'hidden'}}><div style={{width:`${(parseInt(b.count)/max)*100}%`,height:'100%',background:m.color,borderRadius:6}}/></div>
              <span style={{fontSize:10,color:BRAND.MUTED,width:22,textAlign:'right'}}>{b.count}</span>
            </div>
          );})}
        </Card>
      </div>
      <Card><SectionTitle>Agent performance — last 30 days</SectionTitle>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead><tr>{['Agent','Total','Resolved','SLA resp.','SLA res.','Avg resp.','CSAT'].map(h=><th key={h} style={{textAlign:'left',color:BRAND.MUTED,fontWeight:600,padding:'5px 10px',borderBottom:'1px solid #f0f4fa',fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{agents.map(a=>(
            <tr key={a.agent_id} style={{borderBottom:'1px solid #f8faff'}}>
              <td style={{padding:'7px 10px',fontWeight:700}}>{a.agent_name}</td>
              <td style={{padding:'7px 10px'}}>{a.total_conversations}</td>
              <td style={{padding:'7px 10px',color:'#10b981',fontWeight:700}}>{a.resolved}</td>
              <td style={{padding:'7px 10px'}}>{a.sla_response_met}</td>
              <td style={{padding:'7px 10px'}}>{a.sla_resolution_met}</td>
              <td style={{padding:'7px 10px'}}>{a.avg_first_response_mins?`${a.avg_first_response_mins}m`:'—'}</td>
              <td style={{padding:'7px 10px',color:'#f59e0b',fontWeight:700}}>{a.avg_csat?`${a.avg_csat}/5`:'—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}
