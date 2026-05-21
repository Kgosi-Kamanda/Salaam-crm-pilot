// src/features/support/SearchIssues.jsx
import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { issuesAPI } from '../../api/issues';
import { Avatar, SourceChip, PriorityChip, PageTitle } from '../../components/UI.jsx';
import { Input, Select } from '../../components/Form/Input.jsx';
import Button from '../../components/Form/Button.jsx';
import Loader, { EmptyState } from '../../components/Loader';
import { BRAND, FONT } from '../../utils/constants';

export default function SearchIssues() {
  const [q, setQ]         = useState('');
  const [source, setSrc]  = useState('');
  const [priority, setPri]= useState('');
  const [submitted, setSub]= useState(false);
  const { data, loading } = useFetch(() => issuesAPI.list({ search:q, ...(source&&{source}), ...(priority&&{priority}), limit:50 }), [submitted]);
  const convos = data?.conversations || [];
  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', fontFamily:FONT }}>
      <PageTitle>Search Conversations</PageTitle>
      <div style={{ background:'#fff', borderRadius:14, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:20 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
          <div style={{ flex:2, minWidth:220 }}><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search contact name, message content, tags..." onKeyDown={e=>e.key==='Enter'&&setSub(s=>!s)}/></div>
          <div style={{ flex:1, minWidth:150 }}><Select value={source} onChange={e=>setSrc(e.target.value)} options={['facebook','instagram','whatsapp','twitter','tiktok','email','salaampay','webform'].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))} placeholder="All channels"/></div>
          <div style={{ flex:1, minWidth:140 }}><Select value={priority} onChange={e=>setPri(e.target.value)} options={['urgent','high','medium','normal'].map(p=>({value:p,label:p.charAt(0).toUpperCase()+p.slice(1)}))} placeholder="All priorities"/></div>
        </div>
        <Button onClick={()=>setSub(s=>!s)}>Search</Button>
      </div>
      {loading && <Loader/>}
      {!loading && submitted && convos.length===0 && <EmptyState title="No results" subtitle="Try different search terms or filters"/>}
      {convos.map(c=>(
        <div key={c.conversation_id} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, boxShadow:'0 1px 5px rgba(0,0,0,.06)', display:'flex', gap:12, alignItems:'center' }}>
          <Avatar name={c.contact_name} size={34}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:BRAND.TEXT, fontFamily:FONT }}>{c.contact_name}</div>
            <div style={{ display:'flex', gap:5, marginTop:4 }}><SourceChip source={c.source} small/><PriorityChip priority={c.priority} small/></div>
            <div style={{ fontSize:11, color:'#888', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:FONT }}>{c.latest_message}</div>
          </div>
          <div style={{ fontSize:10, color:BRAND.MUTED }}>{c.last_message_at?new Date(c.last_message_at).toLocaleDateString():''}</div>
        </div>
      ))}
    </div>
  );
}
