"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createAuthRequest } from "@/lib/auth-request";

export default function AuthVerify({ tokenHash, type }: { tokenHash: string; type: string }) {
  const request = useRef(createAuthRequest());
  useEffect(()=>{const run=request.current;return()=>run.cancel();},[]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function verify() {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      const result = await request.current("/api/auth/verify", { token_hash: tokenHash, type });
      if (!result) return;
      window.location.replace("/profile");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Please try again shortly."); setPending(false); }
  }
  return <div className="auth-confirm">
    <h2>You’re almost in.</h2>
    <p>Confirm your Cal Poly email to join your circle.</p>
    <button onClick={verify} disabled={pending} className="auth-submit">{pending ? "Confirming…" : "Confirm email and continue"}</button>
    {status && <p role="alert" className="auth-status" data-error="true">{status}</p>}
    <p className="auth-links"><Link href="/verify">Request a new confirmation link</Link> · <Link href="/login">Try logging in</Link></p>
  </div>;
}
