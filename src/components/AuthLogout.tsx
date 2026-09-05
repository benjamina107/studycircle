"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Kept with authentication so logout does not depend on notification settings. */
export default function AuthLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Could not log out. Please try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch { setError("We couldn’t confirm that you’re logged out. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <div className="space-y-2">
    <button onClick={logout} disabled={pending} className="workspace-secondary">{pending ? "Logging out…" : "Log out"}</button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
