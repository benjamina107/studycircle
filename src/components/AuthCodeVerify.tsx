"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {createAuthRequest} from '@/lib/auth-request';

export default function AuthCodeVerify(){
 const request=useRef(createAuthRequest());
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[pending,setPending]=useState(false),[status,setStatus]=useState(''),[failed,setFailed]=useState(false),[cooldown,setCooldown]=useState(0);
 const codeInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{try{setEmail(sessionStorage.getItem('studycircle-auth-email')||'');}catch{}const run=request.current;return()=>run.cancel();},[]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending)return;setPending(true);setStatus('');setFailed(false);
  try{const result=await request.current('/api/auth/verify',{email,code});if(!result)return;try{sessionStorage.removeItem('studycircle-auth-email');}catch{}window.location.replace('/profile');}
  catch(error){setFailed(true);setStatus(error instanceof Error?error.message:'Please try again.');setPending(false);codeInput.current?.focus();}
 }
 async function resend(){if(pending||cooldown)return;setPending(true);setStatus('');setFailed(false);
  try{const result=await request.current('/api/auth/resend',{email});if(!result)return;try{sessionStorage.setItem('studycircle-auth-email',email);}catch{}setStatus(result.message||'Check your inbox for a new code.');setCode('');setCooldown(60);setPending(false);codeInput.current?.focus();}
  catch(error){setFailed(true);setStatus(error instanceof Error?error.message:'Please try again.');setPending(false);}
 }
 return <form className="auth-form" onSubmit={submit} aria-busy={pending}>
  <div className="auth-form-heading"><h2>Check your email</h2><p>Enter the six-digit code from your StudyCircle confirmation email. Check spam if you don’t see it.</p></div>
  <label className="auth-field" htmlFor="verify-email">Cal Poly email<input className="auth-input" id="verify-email" type="email" autoComplete="email" value={email} onChange={e=>{setEmail(e.target.value);setCode('');setStatus('');}} required maxLength={254} disabled={pending} placeholder="you@calpoly.edu"/></label>
  <label className="auth-field" htmlFor="verify-code">Verification code<input ref={codeInput} className="auth-input" id="verify-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required disabled={pending} placeholder="000000" style={{fontSize:24,letterSpacing:'.35em',textAlign:'center'}}/></label>
  <button className="auth-submit" disabled={pending||code.length!==6}>{pending?'Please wait…':'Verify email'}</button>
  {status&&<p className="auth-status" data-error={failed} role={failed?'alert':'status'}>{status}</p>}
  <p className="auth-links"><button type="button" onClick={resend} disabled={pending||cooldown>0||!email.trim()}>{cooldown?`Resend code in ${cooldown}s`:'Resend code'}</button> · <Link href="/login">Back to login</Link></p>
 </form>;
}
