'use client';
import { useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode } from 'react';
import AIMessage from './AIMessage';
import FeedRsvp from '@/components/FeedRsvp';
import type { ChatInvite } from '@/components/chat/ChatDemo';
import { ACCEPT_FILES,MAX_FILE_BYTES,quizletText,type AnswerPayload } from '@/lib/knowledge/shared';
import type { StudyChannel } from '@/lib/knowledge/channels';
import styles from '@/components/chat/ChatDemo.module.css';
import ui from './Study.module.css';
import { useFillViewport } from '@/lib/use-fill-viewport';
type Attachment={id:string;file_name:string};
type Message={author_name:string;attachments?:Attachment[];id:string;author_id:string|null;role:'user'|'assistant';body:string;payload:AnswerPayload|null;ai_status:string;error:string|null;created_at:string};
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
function FilePreview({file,onClose}:{file:Attachment|null;onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [preview,setPreview]=useState<{kind:string;url?:string;text?:string;document?:boolean}|null>(null);
 const [failure,setFailure]=useState('');
 useEffect(()=>{
  if(!file){dialog.current?.close();return;}
  dialog.current?.showModal();const controller=new AbortController();
  api<{kind:string;url?:string;text?:string;document?:boolean}>(`/api/study/uploads/${file.id}?preview=1`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setPreview(data);}).catch(error=>{if(!controller.signal.aborted)setFailure(error instanceof Error?error.message:'Could not open this preview.');});
  return()=>controller.abort();
 },[file]);
 return <dialog ref={dialog} className={ui.filePreview} onClose={onClose} aria-label={file?.file_name||'File preview'}>
  <header><h2>{file?.file_name}</h2><a href={file?`/api/study/uploads/${file.id}`:undefined}>Download</a><button className={ui.libraryClose} onClick={onClose} aria-label="Close file preview"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
  <div className={ui.previewBody}>
   {failure?<p role="alert">{failure}</p>:!preview?<p role="status">Opening preview…</p>:preview.kind==='pdf'?<iframe title={file?.file_name} src={preview.url}/>:preview.kind==='image'?/* eslint-disable-next-line @next/next/no-img-element */
   <img src={preview.url} alt={file?.file_name}/>:preview.kind==='audio'?<audio controls src={preview.url} aria-label={file?.file_name}/>:preview.kind==='text'?<div className={ui.textPreview}>{preview.document&&<p className={ui.fileHint}>Text preview · Download for the original formatting.</p>}<pre>{preview.text}</pre></div>:<p>A preview isn’t available for this format. You can download the original above.</p>}
  </div>
 </dialog>;
}
function RemoveFileDialog({id,pending,onCancel,onRemove,error}:{id:string|null;pending:boolean;onCancel:()=>void;onRemove:()=>void;error?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(id)ref.current?.showModal();else ref.current?.close();},[id]);
 return <dialog ref={ref} className={ui.setDialog} onClose={onCancel} aria-label="Remove file"><header><h2>Remove this file?</h2></header><p>Your upload will be removed from this class.</p>{error&&<p role="alert">{error}</p>}<div className={ui.setActions}><button className={ui.previewSet} disabled={pending} onClick={onCancel}>Cancel</button><button className={ui.copySet} disabled={pending} onClick={onRemove}>{pending?'Removing…':'Remove file'}</button></div></dialog>;
}
export function Notes({subspace,userId}:{subspace:string;userId:string}) {
 const {data,error,refresh}=usePoll<{files:Upload[]}>(`/api/study/uploads?class=${encodeURIComponent(subspace)}`);
 const [files,setFiles]=useState<File[]>([]);const [description,setDescription]=useState('');const [pending,setPending]=useState(false);const [message,setMessage]=useState('');const [failed,setFailed]=useState(false);const [confirm,setConfirm]=useState<string|null>(null);
 const input=useRef<HTMLInputElement>(null);
 async function submit(event:FormEvent){event.preventDefault();setPending(true);setMessage('');setFailed(false);
  try {if(!files.length||files.length>5)throw new Error('Choose 1–5 files.');if(files.some(f=>f.size>MAX_FILE_BYTES))throw new Error('Each file must be 25 MB or smaller.');if(files.reduce((n,f)=>n+f.size,0)>29_000_000)throw new Error('Please upload less than 29 MB at a time.');
   const form=new FormData();form.set('description',description);files.forEach(f=>form.append('files',f));
   await api<{message:string}>(`/api/study/uploads?class=${encodeURIComponent(subspace)}`,{method:'POST',body:form});
   setMessage('Files shared. Circle AI is getting them ready.');uploadDialog.current?.close();setView('library');setPage(0);setFiles([]);setDescription('');if(input.current)input.current.value='';refresh();
  }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Upload failed.');}finally{setPending(false);}
 }
 async function change(id:string,method:'DELETE'|'POST') {setPending(true);setFailed(false);try {const result=await api<{message:string}>(`/api/study/uploads/${id}`,{method});setMessage(result.message);setConfirm(null);refresh();}catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Please retry.');}finally{setPending(false);}}
 const {sectionRef,height}=useFillViewport<HTMLElement>();
 const [view,setView]=useState<'upload'|'library'>('upload');
 const [previewFile,setPreviewFile]=useState<Upload|null>(null);
 const [page,setPage]=useState(0);
 const uploadDialog=useRef<HTMLDialogElement>(null);
 const matched=data?.files||[];
 const pageSize=Math.max(1,Math.min(8,Math.floor(((height||600)-220)/84)));
 const pages=Math.max(1,Math.ceil(matched.length/pageSize));const currentPage=Math.min(page,pages-1);
 function choose(){if(input.current){input.current.value='';input.current.click();}}
 return <section ref={sectionRef} style={height===null?undefined:{height}} className={ui.filesSurface} id="class-files-surface" aria-label="Class files">
  <input ref={input} className={ui.srOnly} tabIndex={-1} aria-label="Choose files" type="file" multiple accept={ACCEPT_FILES} disabled={pending} onChange={e=>{const selected=Array.from(e.target.files||[]);setFiles(selected);if(selected.length){setMessage('');setFailed(false);uploadDialog.current?.showModal();}}}/>
  {view==='upload'?<>
   <div className={ui.uploadLanding}>
    <button className={ui.uploadTarget} type="button" onClick={choose} disabled={pending}>
     <span className={ui.uploadSymbol}><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg></span>
     <h1>Share your notes</h1><span className={ui.uploadSubtitle}>A little of what you know. A lot for your class.</span><span className={ui.choosePill}>Choose files</span>
    </button>
    <p className={ui.fileHint}>Documents, photos & audio · Up to 5 files at once</p>
    <p className={ui.fileHint}>Shared with your class. Circle AI can learn from them.</p>
   </div>
   <footer className={ui.browseFooter}><button onClick={()=>setView('library')}>Browse all files</button></footer>
  </>:<div className={ui.libraryPanel}>
   <header className={ui.libraryHeader}><div><h1>Class files</h1><p>Your class’s shared collection.</p></div><button autoFocus className={ui.libraryClose} onClick={()=>setView('upload')} aria-label="Close class files"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
   <div className={ui.fileRows}>
    {!data&&!error&&<p className={ui.libraryEmpty}>Loading files…</p>}
    {data&&matched.length===0&&<p className={ui.libraryEmpty}>No files yet. Share the first notes with your class.</p>}
    {matched.slice(currentPage*pageSize,(currentPage+1)*pageSize).map(file=><article key={file.id} className={ui.libraryRow}>
     <span className={ui.fileType} aria-hidden="true">{file.file_name.split('.').pop()?.slice(0,4).toUpperCase()}</span>
     <div className={ui.fileInfo}><button className={ui.fileName} onClick={()=>setPreviewFile(file)} title={file.file_name}>{file.file_name}</button><p title={file.description}>{file.description||`${file.uploader_id===userId?'You':'Classmate'} · ${new Date(file.created_at).toLocaleDateString()} · ${(file.byte_size/1e6).toFixed(1)} MB`}</p>
     <span className={ui.badge} data-state={file.kb_assets.status} title={file.kb_assets.error||undefined}>{file.kb_assets.status==='ready'?'Ready for Circle AI':file.kb_assets.status==='failed'?'Needs attention':'Getting ready'}</span></div>
     {file.uploader_id===userId&&<div className={ui.fileControls}>{file.kb_assets.status==='failed'&&<button disabled={pending} onClick={()=>change(file.id,'POST')}>Retry</button>}<button className={ui.removeFileIcon} title="Remove file" disabled={pending} aria-label={'Remove '+file.file_name} onClick={()=>{setMessage('');setFailed(false);setConfirm(file.id);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6"/></svg></button></div>}
    </article>)}
   </div>
   <footer className={ui.libraryFooter}><span>{matched.length} {matched.length===1?'file':'files'}{data?.files.length===200?' · Latest 200':''}</span><div><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label="Previous file page">Previous</button><span>{currentPage+1} / {pages}</span><button disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)} aria-label="Next file page">Next</button></div></footer>
  </div>}
  {message&&<p role={failed?'alert':'status'} className={ui.fileNotice}>{message}</p>}
  {error&&<p role="alert" className={ui.fileNotice}>{error}</p>}
  <dialog ref={uploadDialog} className={ui.setDialog} aria-label="Upload files">
   <header><h2>Ready to share?</h2><button type="button" disabled={pending} onClick={()=>uploadDialog.current?.close()} aria-label="Close upload">×</button></header>
   <form onSubmit={async event=>{await submit(event);}} className={ui.uploadReview}>
    <ul>{files.map((file,i)=><li key={i}>{file.name}<small>{(file.size/1e6).toFixed(1)} MB</small></li>)}</ul>
    <label htmlFor="notes-context">What are you sharing? <span>Optional</span></label><textarea id="notes-context" rows={2} value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000} placeholder="HW 3, lecture notes, or a bit of everything…" disabled={pending}/>
    <p className={ui.fileHint}>Up to 5 files, 25 MB each and 29 MB total. PDFs up to 60 pages; audio up to 1 hour. No video. Upload images in Word documents separately.</p>
    {message&&<p role={failed?'alert':'status'}>{message}</p>}
    <button className={ui.copySet} disabled={pending||!files.length}>{pending?'Uploading…':'Share with class'}</button>
   </form>
  </dialog>
  {previewFile&&<FilePreview key={previewFile.id} file={previewFile} onClose={()=>setPreviewFile(null)}/>}
  <RemoveFileDialog error={failed?message:undefined} id={confirm} pending={pending} onCancel={()=>setConfirm(null)} onRemove={()=>confirm&&void change(confirm,'DELETE')}/>
 </section>;
}
function Conversation({subspace,channel,userId,invites}:{subspace:string;channel:StudyChannel;userId:string;invites:ChatInvite[]}) {
 const url=`/api/study/messages?class=${encodeURIComponent(subspace)}&channel=${channel}`;
 const {data,error,refresh}=usePoll<{messages:Message[]}>(url);
 const [draft,setDraft]=useState('');const [pending,setPending]=useState(false);const [failure,setFailure]=useState('');const [retryId,setRetryId]=useState<string|null>(null);
 const composer=useRef<HTMLTextAreaElement>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 const [files,setFiles]=useState<File[]>([]);
 const [attached,setAttached]=useState<string[]>([]);
 const [previewFile,setPreviewFile]=useState<Attachment|null>(null);
 function chooseFiles(next:File[]){
  const combined=[...files,...next];
  if(combined.length>5||combined.some(f=>f.size>MAX_FILE_BYTES)||combined.reduce((sum,f)=>sum+f.size,0)>29_000_000){setFailure('Choose up to 5 files, 25 MB each and 29 MB total.');return;}
  setFiles(combined);setAttached([]);setRetryId(null);setFailure('');
 }

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
 const mention=channel!=='ai' && mentionMatch && ['circle ai','circleai','ai','classai'].some(name=>name.startsWith(mentionMatch[1].toLowerCase())) && !mentionDismissed && !pending;
 function insertMention(){
  if(!mentionMatch)return;
  const start=caret-mentionMatch[1].length-1;const next=draft.slice(0,start)+'@Circle AI '+draft.slice(caret);
  if(next.length>2000)return;
  setDraft(next);setRetryId(null);setMentionDismissed(true);setCaret(start+11);
  requestAnimationFrame(()=>{composer.current?.focus();composer.current?.setSelectionRange(start+11,start+11);});
 }
 const log=useRef<HTMLDivElement>(null);const count=data?.messages.length||0;
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[count]);
 async function submit(event:FormEvent){event.preventDefault();if((!draft.trim()&&!files.length)||pending)return;setPending(true);setFailure('');const id=retryId||crypto.randomUUID();setRetryId(id);
  try {
   let ids=attached;
   if(files.length&&!ids.length){
    const form=new FormData();files.forEach(file=>form.append('files',file));form.set('description',draft.trim().slice(0,1000));
    const result=await api<{ids:string[]}>(`/api/study/uploads?class=${encodeURIComponent(subspace)}`,{method:'POST',body:form});ids=result.ids;setAttached(ids);
   }
   await api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,channel,body:draft.trim()||'Shared files',attachmentIds:ids})});setDraft('');setFiles([]);setAttached([]);setRetryId(null);refresh();}

  catch(error){setFailure(error instanceof Error?error.message:'Message could not be sent.');}finally{setPending(false);}
 }
 async function retry(id:string){try{await api(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});refresh();}catch(error){setFailure(error instanceof Error?error.message:'Please retry.');}}
 return <>
  <div ref={log} className={`${styles.log} ${ui.log}`} role="log" aria-label={`${channel} messages`} aria-live="polite" tabIndex={0}>
   {channel==='meetups'&&invites.map(invite=><article className={styles.invite} key={invite.id}><h3>{invite.title}</h3><p>{invite.when} · {invite.location}</p><FeedRsvp {...invite}/></article>)}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {!data&&!error&&<p>Loading messages…</p>}
   {data?.messages.length===0&&<p className={styles.empty}>{channel==='ai'?'Your private conversation with Circle AI. Ask about shared class notes or request practice cards—no mention needed.':'Start a conversation. Mention @Circle AI to ask about shared notes or request Quizlet cards.'}</p>}
   <ol className={styles.messages}>{data?.messages.map(m=><li key={m.id} className={styles.message}>
    <span className={styles.avatar} aria-hidden="true">{m.role==='assistant'?'AI':(m.author_name||'?').split(' ').slice(0,2).map(n=>n[0]).join('')}</span><div className={styles.messageBody}>
     <div className={styles.messageMeta}><strong>{m.role==='assistant'?'Circle AI':m.author_name}</strong><span>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
     {m.role==='assistant'?<AIMessage text={m.body} className={ui.markdown}/>:<p className={styles.messageText}>{channel==='ai'?m.body:<MentionText text={m.body}/>}</p>}{m.role==='assistant'&&m.payload&&<Cards payload={m.payload}/>}
     {Boolean(m.attachments?.length)&&<div className={ui.chatAttachments}>{m.attachments?.map(file=><button type="button" key={file.id} onClick={()=>setPreviewFile(file)}>{file.file_name}<small>Preview file</small></button>)}</div>}
     {['queued','processing'].includes(m.ai_status)&&<p className={styles.status}>{m.ai_status==='queued'?'Circle AI is queued…':'Circle AI is reading the class notes…'}</p>}
     {m.ai_status==='failed'&&<p className={styles.error}>{m.error||'Circle AI could not respond.'} {m.author_id===userId&&<button onClick={()=>retry(m.id)}>Retry</button>}</p>}
    </div></li>)}</ol>
  </div>
  <form onSubmit={submit} className={styles.composer}><label htmlFor="study-draft">{channel==='ai'?'Message Circle AI':`Message #${channel}`}</label>
   {files.length>0&&<div className={ui.attachmentQueue}>{files.map((file,i)=><span key={i}>{file.name}<button type="button" disabled={pending||attached.length>0} aria-label={'Remove '+file.name} onClick={()=>{setFiles(files.filter((_,index)=>index!==i));setRetryId(null);}}>×</button></span>)}<small>Shared with your class and saved in Files.{attached.length>0?' Uploaded — retry sending your message.':''}</small></div>}
   <div className={`${ui.composerInput} ${channel!=='ai'?ui.withAttachment:''}`}>
   {channel!=='ai'&&<><input ref={fileInput} type="file" multiple accept={ACCEPT_FILES} hidden onChange={e=>{chooseFiles(Array.from(e.target.files||[]));e.target.value='';}}/><button type="button" className={ui.attachIcon} disabled={pending||attached.length>0} aria-label="Attach files" title="Attach files" onClick={()=>fileInput.current?.click()}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></>}
   {mention&&<div className={ui.mention} id="ai-mention-hint"><button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertMention}><span className={ui.mentionAvatar} aria-hidden="true">AI</span><span><strong>Circle AI <small>@Circle AI</small></strong></span><span className={ui.mentionKey}>Enter ↵</span></button><span className={ui.srOnly} role="status">Circle AI suggestion available. Press Enter or Tab to mention AI. Escape dismisses.</span></div>}
   <textarea ref={composer} rows={1} id="study-draft" value={draft} disabled={pending} maxLength={2000} aria-describedby={mention?'ai-mention-hint':undefined} placeholder={channel==='ai'?'Ask Circle AI about your class…':'Message or @Circle AI…'} onSelect={e=>setCaret(e.currentTarget.selectionStart)} onChange={e=>{setDraft(e.target.value);setCaret(e.target.selectionStart);setMentionDismissed(false);setRetryId(null);}} onKeyDown={e=>{
    if(e.nativeEvent.isComposing)return;
    if(mention&&e.key==='Escape'){e.preventDefault();setMentionDismissed(true);return;}
    if(mention&&(e.key==='Enter'||e.key==='Tab')&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();insertMention();return;}
    if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();e.currentTarget.form?.requestSubmit();}
   }}/>

   <button type="submit" disabled={pending||(!draft.trim()&&!files.length)} className={ui.sendIcon} aria-label={pending?"Sending message":"Send message"}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>
   </div>
   {failure&&<p role="alert" className={styles.error}>{failure}</p>}
  </form>
  {previewFile&&<FilePreview file={previewFile} onClose={()=>setPreviewFile(null)}/>}
 </>;
}
export function PrivateAIConversation({subspace,userId}:{subspace:string;userId:string}) {
 return <div className={ui.chatSurface} style={{flex:1,minHeight:0,height:'auto'}}><Conversation subspace={subspace} userId={userId} channel="ai" invites={[]}/></div>;
}
export default function ClassWorkspace({subspace,userId,classLabel,invites=[]}:{subspace:string;userId:string;classLabel:string;invites?:ChatInvite[]}) {
 const {sectionRef,height}=useFillViewport<HTMLElement>();
 return <section ref={sectionRef} style={height===null?undefined:{height}} className={ui.chatSurface} aria-label={classLabel+' chat'}>
  <Conversation subspace={subspace} channel="general" userId={userId} invites={invites}/>
 </section>;
}
