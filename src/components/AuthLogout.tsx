"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthRequest } from "@/lib/auth-request";

/** Kept with authentication so logout does not depend on notification settings. */
export default function AuthLogout() {
  const router = useRouter();
  const request = useRef(createAuthRequest());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await request.current("/api/auth/logout");
      if (!response) return;
      router.replace("/login");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "We couldn’t confirm that you’re logged out. Please try again."); setPending(false); }
  }
  return <div className="space-y-2">
    <button onClick={logout} disabled={pending} className="workspace-secondary">{pending ? "Logging out…" : "Log out"}</button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
