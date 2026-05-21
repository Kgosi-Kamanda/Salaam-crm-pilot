// src/features/support/Dashboard.jsx — agent personal dashboard
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useFetch } from '../../hooks/useFetch';
import { issuesAPI } from '../../api/issues';
import { dashboardAPI } from '../../api/roles';
import Loader, { ErrorMessage } from '../../components/Loader';
import { StatCard, Card, SectionTitle, PageTitle, SourceChip, PriorityChip, Avatar } from '../../components/UI.jsx';
import { BRAND, FONT } from '../../utils/constants';

export default function SupportDashboard() {
  const { user } = useAuth();
  const { breachCount } = useUser();
  const { data: myIssues, loading: l1 } = useFetch(() => issuesAPI.list({ status:'open', assigned_to: user?.id, limit:20 }), [user?.id]);
  const { data: dashData, loading: l2 } = useFetch(() => dashboardAPI.stats(), []);
  if (l1||l2) return <Loader/>;
  const convos = myIssues?.conversations || [];
  const agents = dashData?.agent_performance || [];
  const me = agents.find(a=>a.agent_id===user?.id);
  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', fontFamily:FONT }}>
      <PageTitle>My Dashboard</PageTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:18 }}>
        <StatCard label="Open assigned to me"  value={convos.length}                            accentColor={BRAND.NAVY}/>
        <StatCard label="Resolved (30 days)"   value={me?.resolved||0}                         accentColor="#10B981"/>
        <StatCard label="Avg first response"   value={me?.avg_first_response_mins?`${me.avg_first_response_mins}m`:'—'} accentColor="#6366F1"/>
        <StatCard label="My CSAT score"        value={me?.avg_csat?`${me.avg_csat}/5`:'—'}     accentColor="#F59E0B"/>
      </div>
      {breachCount>0&&<div style={{ background:'#FFF0F0', border:'1px solid #FFCDD2', borderRadius:10, padding:'12px 16px', color:'#C62828', fontSize:13, marginBottom:16, fontWeight:600 }}>{breachCount} conversation{breachCount>1?'s':''} currently breaching SLA — respond immediately</div>}
      <Card>
        <SectionTitle>My open conversations</SectionTitle>
        {convos.length===0&&<div style={{ color:BRAND.MUTED, fontSize:13 }}>No open conversations assigned to you right now.</div>}
        {convos.map(c=>(
          <div key={c.conversation_id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid #f0f4fa', alignItems:'center' }}>
            <Avatar name={c.contact_name} size={30}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, fontFamily:FONT }}>{c.contact_name}</div>
              <div style={{ display:'flex', gap:5, marginTop:3 }}><SourceChip source={c.source} small/><PriorityChip priority={c.priority} small/></div>
            </div>
            <div style={{ fontSize:10, color:BRAND.MUTED }}>{c.last_message_at?new Date(c.last_message_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
