"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createAuthRequest } from "@/lib/auth-request";

export default function AuthForm({ mode }: { mode: "login" | "signup" | "resend" }) {
  const request = useRef(createAuthRequest());
  useEffect(()=>{const run=request.current;return()=>run.cancel();},[]);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";
  const [email,setEmail]=useState("");
  useEffect(()=>{if(mode==="resend")try{setEmail(sessionStorage.getItem("studycircle-auth-email")||"");}catch{}},[mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true); setStatus(""); setFailed(false);
    try {
      const data = await request.current(`/api/auth/${mode}`, fields);
      if (!data) return;
      try { if(mode==="login")sessionStorage.removeItem("studycircle-auth-email");else sessionStorage.setItem("studycircle-auth-email",String(fields.email||"")); }catch{}
      if (mode === "login") { window.location.replace("/profile"); }
      else if (signup) window.location.replace("/verify");
      else { setStatus(data.message || "Check your inbox and spam folder, or try logging in."); setPending(false); }
    } catch (error) { setFailed(true); setStatus(error instanceof Error ? error.message : "Please try again shortly."); setPending(false); }
  }
  return <form method="post" onSubmit={submit} className="auth-form" aria-busy={pending}>
    <div className="auth-form-heading"><h2>{signup ? "Create an account" : mode === "login" ? "Log in" : "Request a new link"}</h2><p>{signup ? "Use your Cal Poly email. You’ll need to verify it before signing in." : mode === "login" ? "Enter your Cal Poly email and password." : "Enter the email you used to sign up."}</p></div>
    {signup && <label className="auth-field" htmlFor="auth-name">Your name<input disabled={pending} id="auth-name" name="name" autoComplete="name" placeholder="Full name" required maxLength={100} className="auth-input" /></label>}
    <label className="auth-field" htmlFor="auth-email">Cal Poly email<input disabled={pending} id="auth-email" name="email" value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@calpoly.edu" required maxLength={254} className="auth-input" /></label>
    {mode !== "resend" && <div className="auth-field"><label htmlFor="auth-password">Password</label><div className="auth-password"><input disabled={pending} id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "Choose a password" : "Your password"} required minLength={signup ? 12 : 1} maxLength={128} aria-describedby={signup ? "password-hint" : undefined} className="auth-input" /><button type="button" disabled={pending} className="auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div>{signup && <span id="password-hint" className="auth-hint">At least 12 characters.</span>}</div>}
    <button disabled={pending} className="auth-submit">{pending ? "Please wait…" : signup ? "Create account" : mode === "login" ? "Log in" : "Send confirmation link"}</button>
    {status && <p role={failed ? "alert" : "status"} className="auth-status" data-error={failed}>{status}</p>}
    {failed && mode === "login" && <p className="auth-links">Still waiting to confirm your email? <Link href="/verify" onClick={()=>{try{sessionStorage.setItem("studycircle-auth-email",email);}catch{}}}>Get help signing in</Link></p>}
    <p className="auth-links">{signup ? <>Already have an account? <Link href="/login">Log in</Link></> : mode === "login" ? <>No account yet? <Link href="/signup">Sign up</Link></> : <><Link href="/login">Back to login</Link> · <Link href="/signup">Create an account</Link></>}</p>
  </form>;
}
