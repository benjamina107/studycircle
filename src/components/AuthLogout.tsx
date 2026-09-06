"use client";

import { useEffect, useRef, useState } from "react";
import { createAuthRequest } from "@/lib/auth-request";

/** Kept with authentication so logout does not depend on notification settings. */
export default function AuthLogout() {
  const request = useRef(createAuthRequest());
  useEffect(()=>{const run=request.current;return()=>run.cancel();},[]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await request.current("/api/auth/logout");
      if (!response) return;
      window.location.replace("/login");
    } catch (error) { setError(error instanceof Error ? error.message : "We couldn’t confirm that you’re logged out. Please try again."); setPending(false); }
  }
  return <div className="space-y-2">
    <button onClick={logout} disabled={pending} className="workspace-secondary">{pending ? "Logging out…" : "Log out"}</button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
