"use client";
import {useEffect,useRef,useState,useTransition} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {searchClassSections} from '@/app/(app)/catalog-actions';
import {groupByCourse} from '@/lib/class-catalog';
import type {ClassMatch,ClassOption} from '@/lib/onboarding/matching';

export default function ClassSetup(){
 const router=useRouter();const input=useRef<HTMLInputElement>(null);const abort=useRef<AbortController|null>(null);
 const [files,setFiles]=useState<File[]>([]);const [previews,setPreviews]=useState<string[]>([]);
 const [matches,setMatches]=useState<ClassMatch[]>([]);const [scanned,setScanned]=useState(false);const [scanning,setScanning]=useState(false);
 const [message,setMessage]=useState('');const [saving,startSaving]=useTransition();
 const [searchDone,setSearchDone]=useState(false);
 const [manual,setManual]=useState(false);const [query,setQuery]=useState('');const [page,setPage]=useState(0);const [total,setTotal]=useState(0);const [searching,setSearching]=useState(false);const [options,setOptions]=useState<(ClassOption&{code:string;title:string})[]>([]);
 const searchVersion=useRef(0);
 useEffect(()=>{const urls=files.map(f=>URL.createObjectURL(f));setPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url));},[files]);
 useEffect(()=>()=>{abort.current?.abort();searchVersion.current++;},[]);
 const selected=[...new Map(matches.flatMap(m=>{const o=m.options.find(o=>o.sectionId===m.selected);return o?[[JSON.stringify([o.courseId,o.professorId]),o.sectionId] as const]:[]})).values()];
 function chooseFiles(values:File[]){
  if(values.length>4||values.some(f=>f.size>5_000_000)||values.reduce((sum,f)=>sum+f.size,0)>11_500_000){setMessage('Choose up to 4 screenshots, under 5 MB each and 11 MB together.');return;}
  abort.current?.abort();setScanning(false);setFiles(values);setMessage('');
 }
 async function scan(){
  if(!files.length||scanning)return;const controller=new AbortController();abort.current=controller;setScanning(true);setMessage('');
  try{
   const form=new FormData();files.forEach(f=>form.append('screenshots',f));
   const response=await fetch('/api/onboarding/classes',{method:'POST',body:form,signal:controller.signal});const data=await response.json();
   if(!response.ok)throw new Error(data.error||'We couldn’t read those screenshots. Try again.');
   setMatches(current=>[...current,...data.matches.filter((m:ClassMatch)=>!current.some(c=>c.code===m.code&&c.section===m.section)).map((m:ClassMatch,i:number)=>({...m,key:`scan-${Date.now()}-${i}`}))]);setScanned(true);setFiles([]);if(input.current)input.current.value='';setMessage(data.message||'');
  }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Please try again.');}
  finally{if(!controller.signal.aborted)setScanning(false);}
 }
 async function search(nextPage=0){
  const version=++searchVersion.current;setSearching(true);setSearchDone(false);setMessage('');
  try{const result=await searchClassSections(query,'',nextPage);if(version!==searchVersion.current)return;
   setOptions(groupByCourse(result.sections).flatMap(c=>c.sections.map(s=>({sectionId:s.id,courseId:s.course_id!,professorId:s.professor_id!,professor:s.professors.name,term:c.term,code:c.code,title:c.title}))));setPage(nextPage);setSearchDone(true);setTotal(result.total);if(result.message)setMessage(result.message);
  }catch{if(version===searchVersion.current)setMessage('Search is unavailable. Please try again.');}finally{if(version===searchVersion.current)setSearching(false);}
 }
 function finish(skip=false){setMessage('');startSaving(async()=>{try{const response=await fetch('/api/onboarding/classes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sectionIds:skip?[]:selected})});const result=await response.json();if(!response.ok||!result.ok){setMessage(result.message||result.error||'Please try again.');return;}router.push('/profile');router.refresh();}catch{setMessage('We couldn’t save your classes. Please try again.');}});}
 return <div className="class-setup" aria-busy={saving}>
  <p className="onboarding-eyebrow">LESS SEARCHING. MORE STUDYING.</p>
  <h1 id="onboarding-title">Your schedule. Your circle.</h1>
  <p className="onboarding-intro">Drop in a screenshot of your classes. We’ll find your courses and professors, ready for you to join.</p>
  {!scanned&&!manual&&<ol className="schedule-guide">
   <li><span>1</span><div><strong>Open your Cal Poly portal</strong><p>Go to <a href="https://my.calpoly.edu" target="_blank" rel="noopener noreferrer">my.calpoly.edu</a> and log in.</p></div></li>
   <li><span>2</span><div><strong>Find your class list</strong><p>Scroll down to your enrolled classes. Keep the course and section codes visible, like BIO-1111-S03.</p></div></li>
   <li><span>3</span><div><strong>Take a screenshot</strong><p>Include the full list, or take a few screenshots if it doesn’t fit. Crop out personal details you don’t need to share.</p></div></li>
  </ol>}
  {!manual&&<>
   <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="schedule-file-input" aria-label="Choose class screenshots" disabled={scanning||saving} onChange={e=>chooseFiles(Array.from(e.target.files||[]))}/>
   <button type="button" className="schedule-drop" disabled={scanning||saving} onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!scanning&&!saving)chooseFiles(Array.from(e.dataTransfer.files));}}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 14l3-3 4 4 3-3 4 4M12 4v5m-2-2 2-2 2 2"/></svg>
    <strong>{files.length?`${files.length} screenshot${files.length===1?'':'s'} selected`:scanned?'Add another screenshot':'Choose screenshots'}</strong><span>{files.length?'Click to replace your selection':'or drag them here · PNG, JPG, WebP · up to 4'}</span>
   </button>
   {files.length>0&&<div className="schedule-previews">{files.map((file,i)=><figure key={`${file.name}-${i}`}><img src={previews[i]} alt={`Selected screenshot ${i+1}`} /><figcaption>{file.name}</figcaption></figure>)}</div>}
   {files.length>0&&<button className="schedule-primary" disabled={scanning||saving} onClick={scan}>{scanning?'Reading your schedule…':'Find my classes'}</button>}
   {scanning&&<p className="schedule-status" role="status">Circle AI is reading your class list and matching it to the catalog. This can take a moment.</p>}
   <p className="schedule-privacy">Processed with AI to find your classes. Screenshots aren’t saved to your account or shared with classmates.</p>
  </>}
  <button className="schedule-text-button" disabled={scanning||saving} onClick={()=>{setManual(!manual);setMessage('');}}>{manual?'Use a screenshot instead':'I’ll search for my classes instead'}</button>
  {manual&&<div className="schedule-manual"><form onSubmit={e=>{e.preventDefault();search();}}><label htmlFor="schedule-search">Find a course</label><div><input id="schedule-search" value={query} onChange={e=>{searchVersion.current++;setSearching(false);setSearchDone(false);setOptions([]);setTotal(0);setPage(0);setQuery(e.target.value);}} placeholder="e.g. CSC 2001" maxLength={60}/><button className="schedule-primary" disabled={searching||saving||!query.trim()}>Search</button></div></form>
   {searching&&<p role="status">Searching…</p>}
   {searchDone&&!searching&&total===0&&<p className="schedule-status" role="status">No matching classes. Try a course code such as CSC 2001.</p>}
   <ul className="schedule-search-results">{options.map(o=>{const added=matches.some(m=>m.selected&&m.options.some(p=>p.sectionId===m.selected&&p.courseId===o.courseId&&p.professorId===o.professorId));return <li key={o.sectionId}><div><strong>{o.code}</strong><span>{o.professor} · {o.term}</span></div><button disabled={added||saving} aria-label={`Select ${o.code} with ${o.professor}`} onClick={()=>setMatches(current=>[...current,{key:`manual-${o.sectionId}`,code:o.code,title:o.title,section:null,options:[o],selected:o.sectionId,reason:'Selected by you'}])}>{added?'Selected':'Select'}</button></li>;})}</ul>
   {total>0&&<div className="schedule-pagination"><button disabled={page===0||searching||saving} onClick={()=>search(page-1)}>Previous</button><span>Page {page+1} of {Math.ceil(total/8)}</span><button disabled={(page+1)*8>=total||searching||saving} onClick={()=>search(page+1)}>Next</button></div>}
  </div>}
  {scanned&&matches.length>0&&<p className="schedule-status" role="status">Your schedule is ready to review below.</p>}
  {matches.length>0&&<section className="schedule-review" aria-label="Review your classes"><h2>Look right?</h2><p>Check your professors. Lecture and lab rows with the same course and professor join one class.</p>
   <ul>{matches.map(m=><li key={m.key}><div className="schedule-match-heading"><div><strong>{m.code}</strong>{m.section&&<span> · {m.section}</span>}<p>{m.title}</p></div><button className="schedule-remove" disabled={saving} onClick={()=>setMatches(current=>current.filter(v=>v.key!==m.key))} aria-label={`Remove ${m.code} from import`}>×</button></div>
    {m.options.length>0?<label className="schedule-professor">Professor<select disabled={saving} value={m.selected} onChange={e=>setMatches(current=>current.map(v=>v.key===m.key?{...v,selected:e.target.value}:v))}><option value="">Don’t add / choose a professor</option>{m.options.map(o=><option key={o.sectionId} value={o.sectionId}>{o.professor} · {o.term}</option>)}</select></label>:<p className="schedule-unmatched">{m.reason}</p>}
   </li>)}</ul>
  </section>}
  {message&&<p className="schedule-notice" role="alert">{message}</p>}
  <div className="schedule-footer">
   {selected.length>0&&<button className="schedule-primary" disabled={saving||scanning} onClick={()=>finish()}>{saving?'Adding your classes…':`Join ${selected.length} class${selected.length===1?'':'es'} & finish`}</button>}
   <button className="schedule-text-button" disabled={saving||scanning} onClick={()=>finish(true)}>Skip for now</button>
   <Link href="/onboarding" className="schedule-back" aria-disabled={saving||scanning} onClick={e=>{if(saving||scanning)e.preventDefault();}}>Back to profile details</Link>
  </div>
 </div>;
}
