"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthVerify({ tokenHash, type }: { tokenHash: string; type: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function verify() {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token_hash: tokenHash, type }) });
      const result = await response.json();
      if (response.ok) { router.replace("/profile"); router.refresh(); }
      else setStatus(result.error || "We couldn’t confirm your email. Please try again.");
    } catch { setStatus("We couldn’t confirm your email. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <div className="auth-confirm">
    <h2>You’re almost in.</h2>
    <p>Confirm your Cal Poly email to join your circle.</p>
    <button onClick={verify} disabled={pending} className="auth-submit">{pending ? "Confirming…" : "Confirm email and continue"}</button>
    {status && <p role="alert" className="auth-status" data-error="true">{status}</p>}
  </div>;
}
