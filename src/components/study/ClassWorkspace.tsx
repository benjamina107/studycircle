'use client';
import { useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode } from 'react';
import FeedRsvp from '@/components/FeedRsvp';
import type { ChatInvite } from '@/components/chat/ChatDemo';
import { ACCEPT_FILES,MAX_FILE_BYTES,quizletText,type AnswerPayload } from '@/lib/knowledge/shared';
import type { ChatChannelId } from '@/lib/chat-demo';
import styles from '@/components/chat/ChatDemo.module.css';
import ui from './Study.module.css';
import { useFillViewport } from '@/lib/use-fill-viewport';
type Message={id:string;author_id:string|null;role:'user'|'assistant';body:string;payload:AnswerPayload|null;ai_status:string;error:string|null;created_at:string};
type Upload={id:string;file_name:string;description:string;uploader_id:string;byte_size:number;created_at:string;kb_assets:{status:string;error:string|null}};
async function api<T>(url:string,options?:RequestInit):Promise<T> {
 const response=await fetch(url,{...options,cache:'no-store'});const data=await response.json();
 if(!response.ok)throw new Error(data.error||'This request could not be completed.');return data;
}
function usePoll<T>(url:string) {
 const [state,setState]=useState<{data?:T;error:string}>({error:''});
 const [version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
  async function load(){
   try {const data=await api<T>(url,{signal:controller.signal});if(!controller.signal.aborted)setState({data,error:''});}
   catch(error){if(!controller.signal.aborted)setState(s=>({...s,error:error instanceof Error?error.message:'Could not load.'}));}
   if(!controller.signal.aborted)timer=setTimeout(load,document.hidden?15000:3000);
  }
  void load();return()=>{controller.abort();clearTimeout(timer);};
 },[url,version]);
 return {...state,refresh};
}
function MentionText({text}:{text:string}) {
 const parts:ReactNode[]=[];let cursor=0;
 for(const match of text.matchAll(/(^|\s)(@(?:circle[ \t]+ai|circleai|ai|classai)\b)/gi)) {
  const start=match.index!+match[1].length;
  parts.push(text.slice(cursor,start),<mark key={start} className={ui.mentionToken}>{match[2]}</mark>);
  cursor=start+match[2].length;
 }
 parts.push(text.slice(cursor));return <>{parts}</>;
}
function Cards({payload}:{payload:AnswerPayload}) {
 const [status,setStatus]=useState('');
 const [view,setView]=useState<'cards'|'sources'|'import'>('cards');
 const dialog=useRef<HTMLDialogElement>(null);
 const count=payload.cards?.length||0;
 function open(next:typeof view){setView(next);dialog.current?.showModal();}
 async function copy(){try{await navigator.clipboard.writeText(quizletText(payload.cards));setStatus('Copied. Paste into Quizlet’s import tool with tabs between questions and answers and new lines between cards.');}catch{setStatus('Select and copy the import text.');open('import');}}
 return <div className={ui.answerEditorial}>
  {count>0&&<div className={ui.practiceSet}>
   <span className={ui.setEyebrow}>READY TO STUDY</span>
   <h3>Practice cards</h3>
   <p>{count} questions to check what you know.</p>
   <div className={ui.setActions}><button type="button" className={ui.copySet} onClick={copy}>Copy for Quizlet</button><button type="button" className={ui.previewSet} onClick={()=>open('cards')}>Preview</button></div>
   <div className={ui.setFooter}><span>{count} cards · Quizlet import</span>{!!payload.sources?.length&&<button type="button" onClick={()=>open('sources')}>{payload.sources.length} {payload.sources.length===1?'source':'sources'}</button>}</div>
  </div>}
  {!count&&!!payload.sources?.length&&<button type="button" className={ui.sourcesLink} onClick={()=>open('sources')}>{payload.sources.length} {payload.sources.length===1?'source':'sources'}</button>}
  {status&&<p role="status" className={ui.copyStatus}>{status}</p>}
  <dialog ref={dialog} className={ui.setDialog} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.currentTarget.close();}}} aria-label={view==='sources'?'Sources':view==='import'?'Quizlet import text':'Practice cards'}>
   <header><h2>{view==='sources'?'Sources':view==='import'?'Quizlet import text':'Practice cards'}</h2><button type="button" onClick={()=>dialog.current?.close()} aria-label="Close">×</button></header>
   {view==='sources'?<ol className={ui.sourceList}>{payload.sources.map((source,i)=><li key={source.id}><a href={`/api/study/uploads/${source.uploadId}`} target="_blank" rel="noopener noreferrer">[{i+1}] {source.name}</a><p>{source.locator}</p></li>)}</ol>:view==='import'?<><p className={ui.copyStatus}>Paste into Quizlet’s import tool. Use tabs between questions and answers and new lines between cards.</p><textarea readOnly aria-label="Quizlet tab-separated import text" className={ui.export} value={quizletText(payload.cards)}/></>:<ol className={ui.cardList}>{payload.cards.map((card,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{card.question}</h3><p>{card.answer}</p></div></li>)}</ol>}
   {view!=='sources'&&<div className={ui.setActions}><button type="button" className={ui.copySet} onClick={copy}>Copy for Quizlet</button>{view==='cards'&&<button type="button" className={ui.previewSet} onClick={()=>setView('import')}>Import text</button>}<a href="https://quizlet.new" target="_blank" rel="noopener noreferrer" className={ui.previewSet}>Open Quizlet</a></div>}
   {status&&<p role="status" className={ui.copyStatus}>{status}</p>}
  </dialog>
 </div>;
}
export function Notes({subspace,userId}:{subspace:string;userId:string}) {
 const {data,error,refresh}=usePoll<{files:Upload[]}>(`/api/study/uploads?class=${encodeURIComponent(subspace)}`);
 const [files,setFiles]=useState<File[]>([]);const [description,setDescription]=useState('');const [pending,setPending]=useState(false);const [message,setMessage]=useState('');const [failed,setFailed]=useState(false);const [confirm,setConfirm]=useState<string|null>(null);
 const input=useRef<HTMLInputElement>(null);
 async function submit(event:FormEvent){event.preventDefault();setPending(true);setMessage('');setFailed(false);
  try {if(!files.length||files.length>5)throw new Error('Choose 1–5 files.');if(files.some(f=>f.size>MAX_FILE_BYTES))throw new Error('Each file must be 25 MB or smaller.');if(files.reduce((n,f)=>n+f.size,0)>29_000_000)throw new Error('Please upload less than 29 MB at a time.');
   const form=new FormData();form.set('description',description);files.forEach(f=>form.append('files',f));
   const result=await api<{message:string}>(`/api/study/uploads?class=${encodeURIComponent(subspace)}`,{method:'POST',body:form});
   setMessage(result.message);setFiles([]);setDescription('');if(input.current)input.current.value='';refresh();
  }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Upload failed.');}finally{setPending(false);}
 }
 async function change(id:string,method:'DELETE'|'POST') {setPending(true);setFailed(false);try {const result=await api<{message:string}>(`/api/study/uploads/${id}`,{method});setMessage(result.message);setConfirm(null);refresh();}catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Please retry.');}finally{setPending(false);}}
 return <div className={ui.notes}>
  <form onSubmit={submit} className={ui.upload}>
   <h3>Share what you have</h3><p>Notes, homework, recordings, or a mix. Shared with this class and used by Circle AI.</p>
   <label htmlFor="notes-files">Choose files</label><input ref={input} id="notes-files" type="file" multiple accept={ACCEPT_FILES} disabled={pending} onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
   <label htmlFor="notes-context">What are you sharing? <span>(optional)</span></label><textarea id="notes-context" value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000} placeholder="HW 3, Lecture 1, lectures and homework…" disabled={pending}/>
   <p className={styles.small}>PDF, DOCX, text, JPG, PNG, WebP, or audio · 5 files at a time · 25 MB per file · no video. PDF: up to 60 pages. Audio: up to 1 hour. DOCX images should be uploaded separately.</p>
   {files.length>0&&<ul>{files.map((f,i)=><li key={i}>{f.name} · {(f.size/1e6).toFixed(1)} MB</li>)}</ul>}
   <button className={styles.submit} disabled={pending||!files.length}>{pending?'Working…':'Upload notes'}</button>
  </form>
  {message&&<p role={failed?'alert':'status'} className={failed?styles.error:styles.status}>{message}</p>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <h3 className={ui.sectionTitle}>Class contributions</h3>
  {!data&&!error&&<p>Loading notes…</p>}
  {data?.files.length===0&&<p className={styles.empty}>No notes yet. Your first upload starts the class knowledge base.</p>}
  {data?.files.map(file=><article key={file.id} className={ui.file}>
   <div><a href={`/api/study/uploads/${file.id}`} target="_blank" rel="noopener noreferrer"><strong>{file.file_name}</strong></a><span className={ui.badge} data-state={file.kb_assets.status}>{file.kb_assets.status==='queued'?'Queued':file.kb_assets.status==='processing'?'Processing':file.kb_assets.status==='ready'?'Ready':'Needs attention'}</span></div>
   {file.description&&<p>{file.description}</p>}<p className={styles.small}>{file.uploader_id===userId?'You':'Classmate'} · {(file.byte_size/1e6).toFixed(1)} MB · {new Date(file.created_at).toLocaleDateString()}</p>
   {file.kb_assets.error&&<p className={styles.error}>{file.kb_assets.error}</p>}
   {file.uploader_id===userId&&<div className={ui.actions}>{file.kb_assets.status==='failed'&&<button disabled={pending} onClick={()=>change(file.id,'POST')}>Retry processing</button>}{confirm===file.id?<><span>Remove this contribution?</span><button disabled={pending} onClick={()=>change(file.id,'DELETE')}>Remove</button><button onClick={()=>setConfirm(null)}>Cancel</button></>:<button disabled={pending} onClick={()=>setConfirm(file.id)}>Remove</button>}</div>}
  </article>)}
  {!!data&&data.files.length===200&&<p className={styles.small}>Showing the latest 200 contributions. Older ready notes still inform Circle AI.</p>}
 </div>;
}
function Conversation({subspace,channel,userId,invites}:{subspace:string;channel:ChatChannelId;userId:string;invites:ChatInvite[]}) {
 const url=`/api/study/messages?class=${encodeURIComponent(subspace)}&channel=${channel}`;
 const {data,error,refresh}=usePoll<{messages:Message[]}>(url);
 const [draft,setDraft]=useState('');const [pending,setPending]=useState(false);const [failure,setFailure]=useState('');const [retryId,setRetryId]=useState<string|null>(null);
 const composer=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{
  const input=composer.current;if(!input)return;
  const resize=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight+2,130)+'px';input.style.overflowY=input.scrollHeight+2>130?'auto':'hidden';};
  resize();
  const observer=new ResizeObserver(()=>{if(input.clientWidth!==width){width=input.clientWidth;resize();}});
  let width=input.clientWidth;observer.observe(input);
  return()=>observer.disconnect();
 },[draft]);
 const [caret,setCaret]=useState(0);const [mentionDismissed,setMentionDismissed]=useState(false);
 const mentionMatch=draft.slice(0,caret).match(/(?:^|\s)@([a-z]*(?: [a-z]*)?)$/i);
 const mention=mentionMatch && ['circle ai','circleai','ai','classai'].some(name=>name.startsWith(mentionMatch[1].toLowerCase())) && !mentionDismissed && !pending;
 function insertMention(){
  if(!mentionMatch)return;
  const start=caret-mentionMatch[1].length-1;const next=draft.slice(0,start)+'@Circle AI '+draft.slice(caret);
  if(next.length>2000)return;
  setDraft(next);setRetryId(null);setMentionDismissed(true);setCaret(start+11);
  requestAnimationFrame(()=>{composer.current?.focus();composer.current?.setSelectionRange(start+11,start+11);});
 }
 const log=useRef<HTMLDivElement>(null);const count=data?.messages.length||0;
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[count]);
 async function submit(event:FormEvent){event.preventDefault();if(!draft.trim()||pending)return;setPending(true);setFailure('');const id=retryId||crypto.randomUUID();setRetryId(id);
  try {await api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,channel,body:draft.trim()})});setDraft('');setRetryId(null);refresh();}
  catch(error){setFailure(error instanceof Error?error.message:'Message could not be sent.');}finally{setPending(false);}
 }
 async function retry(id:string){try{await api(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});refresh();}catch(error){setFailure(error instanceof Error?error.message:'Please retry.');}}
 return <>
  <div ref={log} className={`${styles.log} ${ui.log}`} role="log" aria-label={`${channel} messages`} aria-live="polite" tabIndex={0}>
   {channel==='meetups'&&invites.map(invite=><article className={styles.invite} key={invite.id}><h3>{invite.title}</h3><p>{invite.when} · {invite.location}</p><FeedRsvp {...invite}/></article>)}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {!data&&!error&&<p>Loading messages…</p>}
   {data?.messages.length===0&&<p className={styles.empty}>Start a conversation. Mention @Circle AI to ask about shared notes or request Quizlet cards.</p>}
   <ol className={styles.messages}>{data?.messages.map(m=><li key={m.id} className={styles.message}>
    <span className={styles.avatar} aria-hidden="true">{m.role==='assistant'?'AI':m.author_id===userId?'Y':'C'}</span><div className={styles.messageBody}>
     <div className={styles.messageMeta}><strong>{m.role==='assistant'?'Circle AI':m.author_id===userId?'You':'Classmate'}</strong><span>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
     <p className={styles.messageText}><MentionText text={m.body}/></p>{m.role==='assistant'&&m.payload&&<Cards payload={m.payload}/>}
     {['queued','processing'].includes(m.ai_status)&&<p className={styles.status}>{m.ai_status==='queued'?'Circle AI is queued…':'Circle AI is reading the class notes…'}</p>}
     {m.ai_status==='failed'&&<p className={styles.error}>{m.error||'Circle AI could not respond.'} {m.author_id===userId&&<button onClick={()=>retry(m.id)}>Retry</button>}</p>}
    </div></li>)}</ol>
  </div>
  <form onSubmit={submit} className={styles.composer}><label htmlFor="study-draft">Message #{channel}</label>
   <div className={ui.composerInput}>
   {mention&&<div className={ui.mention} id="ai-mention-hint"><button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertMention}><span className={ui.mentionAvatar} aria-hidden="true">AI</span><span><strong>Circle AI <small>@Circle AI</small></strong></span><span className={ui.mentionKey}>Enter ↵</span></button><span className={ui.srOnly} role="status">Circle AI suggestion available. Press Enter or Tab to mention AI. Escape dismisses.</span></div>}
   <textarea ref={composer} rows={1} id="study-draft" value={draft} disabled={pending} maxLength={2000} aria-describedby={mention?'ai-mention-hint':undefined} placeholder="Message your class, or @Circle AI make 20 cards about HW 3…" onSelect={e=>setCaret(e.currentTarget.selectionStart)} onChange={e=>{setDraft(e.target.value);setCaret(e.target.selectionStart);setMentionDismissed(false);setRetryId(null);}} onKeyDown={e=>{
    if(e.nativeEvent.isComposing)return;
    if(mention&&e.key==='Escape'){e.preventDefault();setMentionDismissed(true);return;}
    if(mention&&(e.key==='Enter'||e.key==='Tab')&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();insertMention();return;}
    if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();e.currentTarget.form?.requestSubmit();}
   }}/>

   <button type="submit" disabled={pending||!draft.trim()} className={ui.sendIcon} aria-label={pending?"Sending message":"Send message"}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>
   </div>
   {failure&&<p role="alert" className={styles.error}>{failure}</p>}
  </form>
 </>;
}
export default function ClassWorkspace({subspace,userId,classLabel,initialChannel='general',invites=[]}:{subspace:string;userId:string;classLabel:string;initialChannel?:ChatChannelId;invites?:ChatInvite[]}) {
 const [channel,setChannel]=useState<ChatChannelId>(initialChannel);
 const {sectionRef,height}=useFillViewport<HTMLElement>();
 const channelMenu=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const close=(event:PointerEvent)=>{if(channelMenu.current&&!channelMenu.current.contains(event.target as Node))channelMenu.current.open=false;};
  document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);
 },[]);
 return <section ref={sectionRef} style={height===null?undefined:{height}} className={ui.chatSurface} aria-label={classLabel+' chat'}>
  <header className={ui.chatToolbar}>
   <details ref={channelMenu} className={ui.channelPicker} id="active-conversation" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();if(channelMenu.current){channelMenu.current.open=false;channelMenu.current.querySelector('summary')?.focus();}}}}>
    <summary aria-label={'Choose conversation. Current: '+channel}><span aria-hidden="true">#</span>{channel[0].toUpperCase()+channel.slice(1)}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <nav className={ui.channelMenu} aria-label="Conversations"><span className={ui.channelMenuLabel}>CLASS CHANNELS</span>{(['general','homework','meetups'] as const).map(name=><button key={name} type="button" aria-current={channel===name?'true':undefined} onClick={()=>{setChannel(name);if(channelMenu.current){channelMenu.current.open=false;channelMenu.current.querySelector('summary')?.focus();}}}><span aria-hidden="true">#</span><span><strong>{name[0].toUpperCase()+name.slice(1)}</strong><small>{name==='general'?'Talk with your class':name==='homework'?'Questions and problem solving':'Plan a study session'}</small></span>{channel===name&&<span className={ui.channelCheck} aria-hidden="true">✓</span>}</button>)}</nav>
   </details>
   <span className={ui.chatContext}>Class chat <span aria-hidden="true">·</span> @Circle AI available</span>
  </header>
  <Conversation key={channel} subspace={subspace} channel={channel} userId={userId} invites={invites}/>
 </section>;
}
