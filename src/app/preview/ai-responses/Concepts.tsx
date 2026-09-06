'use client';
import {useState} from 'react';
import s from './style.module.css';
const cards=[['What does lift depend on?','Air density, airspeed, wing area, and the lift coefficient.'],['What is angle of attack?','The angle between the wing chord and the relative airflow.'],['Why does a wing stall?','The angle of attack exceeds its critical value, causing airflow separation.']];
export default function Concepts(){
 const [option,setOption]=useState(0),[panel,setPanel]=useState(''),[copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(cards.map(c=>c.join('\t')).join('\n'));setCopied(true);}catch{setPanel('Import text');}}
 const copyButton=<button className={s.primary} onClick={copy}>{copied?'✓ Copied':'Copy for Quizlet'}</button>;
 const sourceButton=<button className={s.source} onClick={()=>setPanel(panel==='Sources'?'':'Sources')}>2 sources</button>;
 return <div className={s.page}><header className={s.intro}><span className={s.eyebrow}>STUDYCIRCLE / AI RESPONSE DIRECTIONS</span><h1>One direction. Three quieter takes.</h1><p>Compact study sets. No decorative icons or button arrows. Sample content only.</p></header>
 <nav className={s.options} aria-label="Response designs">{['01 · Soft panel','02 · Minimal strip','03 · Editorial block'].map((n,i)=><button aria-pressed={option===i} key={n} onClick={()=>{setOption(i);setPanel('');setCopied(false);}}>{n}</button>)}</nav>
 <main className={s.chat}><header className={s.chatHeader}><span># General</span><small>AERO 1121</small></header><div className={s.message}><span className={s.avatar}>Y</span><div><strong>You <small>2:34 PM</small></strong><p><mark>@AI</mark> Make me some practice cards about lift and stalls.</p></div></div>
 <div className={s.message}><span className={`${s.avatar} ${s.ai}`}>AI</span><div className={s.body}><strong>ClassAI <small>2:34 PM</small></strong><p>Here are three practice cards from your notes on lift and stalls.</p>
 {option===0&&<><div className={s.attachment}><div className={s.attachmentTitle}><div><span className={s.eyebrow}>PRACTICE SET</span><h2>Lift &amp; stalls</h2><p>3 question / answer cards</p></div><span className={s.format}>QUIZLET</span></div><div className={s.attachmentActions}>{copyButton}<button className={s.quiet} onClick={()=>setPanel('Preview cards')}>Preview cards</button></div></div><div className={s.under}>{sourceButton}<span>Paste into Quizlet’s import tool.</span></div></>}
 {option===1&&<div className={s.strip}><div className={s.stripTop}><div><h2>Lift &amp; stalls</h2><p>Practice set <span>·</span> 3 cards</p></div>{copyButton}</div><div className={s.stripBottom}><button className={s.quiet} onClick={()=>setPanel('Preview cards')}>Preview cards</button>{sourceButton}</div></div>}
 {option===2&&<div className={s.editorial}><span className={s.eyebrow}>READY TO STUDY</span><h2>Lift &amp; stalls</h2><p>Three questions to check what you know.</p><div className={s.editorialActions}>{copyButton}<button className={s.textButton} onClick={()=>setPanel('Preview cards')}>Preview</button></div><div className={s.editorialFoot}><span>3 cards · Quizlet import</span>{sourceButton}</div></div>}

 </div></div>
 <div className={s.composer}>Message your class, or @AI… <span>↑</span></div></main>
 <p className={s.caption}>{['Soft panel — a gentle background groups the study set, with preview and copying side by side.','Minimal strip — no enclosing card. The title and actions sit between two quiet rules.','Editorial block — a larger title, a slim accent line, and a clear primary action.'][option]}</p>
 {panel&&<div className={s.scrim} onClick={()=>setPanel('')}><section className={s.panel} role="dialog" aria-modal="true" aria-label={panel} onClick={e=>e.stopPropagation()}><header><h2>{panel}</h2><button autoFocus aria-label="Close preview" onClick={()=>setPanel('')}>×</button></header>{panel==='Sources'?<ul className={s.sources}><li><strong>Lecture 3 — Flight fundamentals.pdf</strong><p>Pages 4–6 · Lift and angle of attack</p></li><li><strong>Study group notes.txt</strong><p>Stalls and airflow separation</p></li></ul>:panel==='Import text'?<textarea readOnly aria-label="Quizlet import text" value={cards.map(c=>c.join('\t')).join('\n')}/>:<ol className={s.worksheet}>{cards.map((c,i)=><li key={c[0]}><span className={s.number}>{i+1}</span><div><h3>{c[0]}</h3><p>{c[1]}</p></div></li>)}</ol>}{panel!=='Sources'&&copyButton}<p className={s.muted}>Concept preview · no changes to your class</p></section></div>}
 </div>;
}
