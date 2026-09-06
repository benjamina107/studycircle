export type AuthReply = { error?: string; message?: string; next?: string };

// Each mounted form owns a synchronous gate, independent of React render timing.
export function createAuthRequest(request: typeof fetch = fetch, timeoutMs = 15000) {
  let active = false;
  let activeController:AbortController|null=null;
  const cancelled=new WeakSet<AbortController>();
  const run = async (path: string, fields?: Record<string, unknown>): Promise<AuthReply | null> => {
    if (active) return null;
    active = true;
    const controller = new AbortController();
    activeController=controller;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(path, { method: "POST", signal: controller.signal,
        ...(fields ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) } : {}),
      });
      let data: AuthReply;
      try { data = await response.json(); }
      catch { throw new Error("The service returned an unreadable response. Please try again shortly."); }
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The service returned an unreadable response. Please try again shortly.");
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "We couldn’t complete your request. Please try again shortly.");
      if (typeof data.message !== "string" && typeof data.next !== "string") throw new Error("The service returned an incomplete response. Please try again shortly.");
      if (cancelled.has(controller)) return null;
      return data;
    } catch (error) {
      if (cancelled.has(controller)) return null;
      if (controller.signal.aborted) throw new Error(path.endsWith("/logout")
        ? "We couldn’t confirm that you’re logged out. Check your connection and try again."
        : path.endsWith("/login") ? "Login took too long. Check your connection and try again."
        : path.endsWith("/verify") ? "We couldn’t confirm the result. Try logging in before requesting another code."
        : "This request took too long. Check your inbox or try logging in before retrying; the request may have completed.");
      if (error instanceof TypeError) throw new Error("We couldn’t connect. Check your connection and try again.");
      throw error;
    } finally { clearTimeout(timer); active = false; activeController=null; }
  };
  return Object.assign(run,{cancel(){if(activeController){cancelled.add(activeController);activeController.abort();}}});
}
