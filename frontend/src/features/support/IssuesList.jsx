// src/features/support/IssuesList.jsx — Full inbox implementation
import { useState, useRef, useEffect } from 'react';
import { useIssues, useMessages, useTags, useCanned } from '../../hooks/useFetch';
import { issuesAPI, cannedAPI } from '../../api/issues';
import { teamAPI } from '../../api/users';
import { Avatar, SourceChip, PriorityChip, SLATimer, TagChip } from '../../components/UI.jsx';
import Loader, { ErrorMessage, EmptyState } from '../../components/Loader';
import { BRAND, FONT } from '../../utils/constants';

function ConvoList({ selected, onSelect, filter, setFilter, refreshKey }) {
  const params = { status: filter.status||'open', ...(filter.priority&&{priority:filter.priority}), limit: 100 };
  const { data, loading, error, reload } = useIssues(params);
  const convos = data?.conversations || [];
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t); }, [reload]);
  return (
    <div style={{ width:268, borderRight:`1px solid ${BRAND.BORDER}`, overflowY:'auto', background:'#fff', flexShrink:0 }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid #f0f4fa' }}>
        <input placeholder="Search conversations..." style={{ width:'100%', padding:'7px 11px', borderRadius:8, border:`1px solid ${BRAND.BORDER}`, fontSize:11, background:BRAND.BG, fontFamily:FONT, boxSizing:'border-box' }}/>
        <div style={{ display:'flex', gap:4, marginTop:6 }}>
          {['open','resolved','snoozed'].map(s=>(
            <button key={s} onClick={()=>setFilter(f=>({...f,status:s}))} style={{ flex:1, padding:'4px 0', borderRadius:6, border:'none', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT, textTransform:'capitalize', background:filter.status===s?BRAND.NAVY:'#f0f4fa', color:filter.status===s?'#fff':'#888' }}>{s}</button>
          ))}
        </div>
        <select value={filter.priority||''} onChange={e=>setFilter(f=>({...f,priority:e.target.value}))} style={{ width:'100%', marginTop:6, padding:'5px 9px', borderRadius:8, border:`1.5px solid ${BRAND.BORDER}`, fontSize:11, fontFamily:FONT }}>
          <option value="">All priorities</option>
          {['urgent','high','medium','normal'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>
      </div>
      {loading && <Loader size={24}/>}
      {error   && <ErrorMessage message={error}/>}
      {!loading && convos.length===0 && <EmptyState title="No conversations" subtitle="Messages from all channels appear here"/>}
      {convos.map(c=>(
        <div key={c.conversation_id} onClick={()=>onSelect(c)} style={{ display:'flex', gap:8, padding:'10px 12px', borderBottom:'1px solid #f0f4fa', cursor:'pointer', background:selected?.conversation_id===c.conversation_id?'#eef3ff':'#fff', borderLeft:`3px solid ${(c.sla_response_breached||c.sla_resolution_breached)?'#ef4444':selected?.conversation_id===c.conversation_id?BRAND.NAVY:'transparent'}` }}>
          <Avatar name={c.contact_name} size={32}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:700, color:BRAND.TEXT, fontFamily:FONT }}>{c.contact_name||'Unknown'}</span>
              <span style={{ fontSize:9, color:'#bbb' }}>{c.last_message_at?new Date(c.last_message_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</span>
            </div>
            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
              <SourceChip source={c.source} small/>
              <PriorityChip priority={c.priority} small/>
              {parseInt(c.unread_count)>0&&<span style={{ background:BRAND.NAVY, color:'#fff', fontSize:9, fontWeight:800, borderRadius:20, padding:'1px 6px', fontFamily:FONT }}>{c.unread_count}</span>}
            </div>
            {(c.sla_response_breached||c.sla_resolution_breached)&&<div style={{ marginTop:3 }}><SLATimer due={c.sla_first_response_due} breached={c.sla_response_breached} label="Reply"/></div>}
            <div style={{ fontSize:10, color:'#999', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:FONT }}>{c.latest_message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Thread({ conversation, onUpdated }) {
  const { data, loading, reload } = useMessages(conversation.conversation_id);
  const { data: tagsData }   = useTags();
  const { data: cannedData } = useCanned();
  const [reply, setReply]     = useState('');
  const [isNote, setIsNote]   = useState(false);
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [showTags,   setShowTags]   = useState(false);
  const [teamList,   setTeamList]   = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const bottomRef = useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[data]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try { await issuesAPI.sendMessage(conversation.conversation_id,{body:reply,is_internal_note:isNote}); setReply(''); reload(); }
    catch { alert('Failed to send'); }
    finally { setSending(false); }
  };

  const resolve  = async () => {
    if (!window.confirm('Mark resolved? A CSAT email will be sent to the customer.')) return;
    await issuesAPI.resolve(conversation.conversation_id); onUpdated();
  };
  const addTag   = async (id) => { await issuesAPI.addTag(conversation.conversation_id, id); setShowTags(false); onUpdated(); };
  const useCR    = async (cr) => { setReply(cr.body); setShowCanned(false); await cannedAPI.use(cr.id).catch(()=>{}); };
  const assignTo = async (uid) => { await issuesAPI.assign(conversation.conversation_id, uid); setShowAssign(false); onUpdated(); };
  const loadTeam = async () => { if (teamList) return; const r = await teamAPI.list(); setTeamList(r.data.team||[]); };

  const messages = data?.messages || [];
  const allTags  = tagsData?.tags || [];
  const canned   = cannedData?.canned_responses || [];
  const convTags = conversation.tags || [];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:BRAND.BG, overflow:'hidden' }}>
      <div style={{ padding:'11px 16px', background:'#fff', borderBottom:`1px solid ${BRAND.BORDER}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <Avatar name={conversation.contact_name} size={36}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:BRAND.NAVY, fontFamily:FONT }}>{conversation.contact_name||'Unknown'}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
            <SourceChip source={conversation.source}/>
            <PriorityChip priority={conversation.priority}/>
            {convTags.map(t=><TagChip key={t} name={t}/>)}
            <SLATimer due={conversation.sla_first_response_due} breached={conversation.sla_response_breached} label="Reply"/>
            <SLATimer due={conversation.sla_resolution_due}     breached={conversation.sla_resolution_breached} label="Resolve"/>
          </div>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          <button onClick={()=>setShowTags(!showTags)} style={{ background:'transparent', border:`1.5px solid ${BRAND.NAVY}`, color:BRAND.NAVY, borderRadius:8, padding:'5px 11px', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>Tag</button>
          <button onClick={()=>{ setShowAssign(!showAssign); loadTeam(); }} style={{ background:'#f0f4fa', border:'none', color:'#555', borderRadius:8, padding:'5px 11px', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>Assign</button>
          <select value={conversation.priority} onChange={e=>issuesAPI.update(conversation.conversation_id,{priority:e.target.value}).then(onUpdated)} style={{ padding:'4px 8px', borderRadius:7, border:`1.5px solid ${BRAND.BORDER}`, fontSize:10, fontWeight:700, color:BRAND.NAVY, fontFamily:FONT }}>
            {['urgent','high','medium','normal'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          <button onClick={resolve} style={{ background:'#ECFDF5', border:'none', color:'#065F46', borderRadius:8, padding:'5px 11px', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>Resolve</button>
        </div>
      </div>

      {showTags && (
        <div style={{ background:'#fff', borderBottom:`1px solid ${BRAND.BORDER}`, padding:'9px 16px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#888', marginBottom:7, fontFamily:FONT }}>ADD TAG</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {allTags.filter(t=>!convTags.includes(t.name)).map(t=>(
              <button key={t.id} onClick={()=>addTag(t.id)} style={{ background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}40`, borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>{t.name}</button>
            ))}
          </div>
        </div>
      )}

      {showAssign && teamList && (
        <div style={{ background:'#fff', borderBottom:`1px solid ${BRAND.BORDER}`, padding:'9px 16px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#888', marginBottom:7, fontFamily:FONT }}>ASSIGN TO</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {teamList.filter(m=>m.is_active).map(m=>(
              <button key={m.id} onClick={()=>assignTo(m.id)} style={{ background:conversation.assigned_to===m.id?BRAND.NAVY:'#f0f4fa', color:conversation.assigned_to===m.id?'#fff':BRAND.TEXT, border:'none', borderRadius:20, padding:'5px 12px', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>{m.full_name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
        {loading && <Loader size={24}/>}
        {!loading && messages.length===0 && <EmptyState title="No messages yet"/>}
        {messages.map(m=>(
          <div key={m.id} style={{ display:'flex', justifyContent:m.is_internal_note?'center':m.direction==='outbound'?'flex-end':'flex-start' }}>
            {m.is_internal_note?(
              <div style={{ background:'#fffbeb', border:'1px dashed #f59e0b', borderRadius:9, padding:'8px 14px', maxWidth:'78%', fontSize:10, color:'#92400e', fontFamily:FONT }}>
                <strong>Internal note</strong> &middot; {m.sent_by_name}: {m.body}
              </div>
            ):(
              <div style={{ maxWidth:'64%', padding:'10px 14px', fontSize:12, lineHeight:1.55, fontFamily:FONT, background:m.direction==='outbound'?BRAND.NAVY:'#fff', color:m.direction==='outbound'?'#fff':BRAND.TEXT, borderRadius:m.direction==='outbound'?'14px 4px 14px 14px':'4px 14px 14px 14px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
                {m.body}
                <div style={{ fontSize:9, opacity:.5, marginTop:5, textAlign:'right' }}>
                  {m.direction==='outbound'?`${m.sent_by_name||'You'} · `:''}
                  {new Date(m.sent_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  {m.delivery_status==='failed'&&<span style={{ marginLeft:6 }}> Failed to send</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {showCanned && (
        <div style={{ background:'#fff', borderTop:`1px solid ${BRAND.BORDER}`, maxHeight:220, overflowY:'auto', padding:'10px 16px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#888', marginBottom:8, fontFamily:FONT }}>QUICK REPLIES</div>
          {canned.map(cr=>(
            <div key={cr.id} onClick={()=>useCR(cr)} style={{ padding:'8px 10px', borderRadius:8, cursor:'pointer', marginBottom:4, background:BRAND.BG, fontFamily:FONT }}>
              {cr.shortcut&&<span style={{ fontWeight:700, color:BRAND.NAVY, marginRight:8, fontSize:11 }}>{cr.shortcut}</span>}
              <span style={{ fontSize:12, color:'#555' }}>{cr.title}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:'10px 14px', background:'#fff', borderTop:`1px solid ${BRAND.BORDER}` }}>
        <div style={{ display:'flex', gap:5, marginBottom:7 }}>
          {[{l:'Reply',v:false},{l:'Internal Note',v:true}].map(o=>(
            <button key={String(o.v)} onClick={()=>setIsNote(o.v)} style={{ padding:'3px 10px', borderRadius:7, border:'none', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT, background:isNote===o.v?(o.v?'#fffbeb':BRAND.NAVY):'#f0f4fa', color:isNote===o.v?(o.v?'#92400e':'#fff'):'#888' }}>{o.l}</button>
          ))}
          <button onClick={()=>setShowCanned(!showCanned)} style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:7, border:'none', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT, background:'#f0f4fa', color:'#888' }}>Quick Replies</button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} rows={2} placeholder={isNote?'Internal note — visible to team only...':'Type a reply... (Enter to send, Shift+Enter for new line)'} style={{ flex:1, padding:'8px 12px', borderRadius:9, border:`1.5px solid ${BRAND.BORDER}`, fontSize:12, fontFamily:FONT, background:isNote?'#fffbeb':BRAND.BG, resize:'none' }}/>
          <button onClick={send} disabled={sending||!reply.trim()} style={{ background:BRAND.NAVY, color:'#fff', border:'none', borderRadius:9, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:(sending||!reply.trim())?'not-allowed':'pointer', fontFamily:FONT, alignSelf:'flex-end', opacity:(sending||!reply.trim())?0.55:1 }}>
            {sending?'...':'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IssuesList() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState({ status:'open', priority:'' });
  const [key, setKey]           = useState(0);
  return (
    <div style={{ display:'flex', height:'100%' }}>
      <ConvoList key={key} selected={selected} onSelect={setSelected} filter={filter} setFilter={setFilter}/>
      {selected ? (
        <Thread key={selected.conversation_id} conversation={selected} onUpdated={()=>{ setSelected(null); setKey(k=>k+1); }}/>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'#ccc', gap:12 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#ddd" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          <span style={{ fontSize:14, fontFamily:FONT, color:'#bbb' }}>Select a conversation</span>
        </div>
      )}
    </div>
  );
}
