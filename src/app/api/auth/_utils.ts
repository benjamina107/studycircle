import { InputError } from "./validation";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export function apiError(error: unknown) {
  if (error instanceof InputError) return json({ error: error.message }, error.status);
  return json({ error: "The service is unavailable. Please try again shortly." }, 503);
}

// Never return provider messages: they may contain service details or identifiers.
export function authFailure(error: { status?: number; code?: string } | null, operation: "login" | "signup" | "resend" | "verify") {
  if (error?.status === 429 || ["over_request_rate_limit", "over_email_send_rate_limit"].includes(error?.code || "")) {
    return json({ error: "Too many requests. Please wait before trying again. Email limits may take longer to reset." }, 429);
  }
  if (error?.status === 0 || (error?.status ?? 0) >= 500 || error?.code === "unexpected_failure") {
    return json({ error: "The service is unavailable. Please try again shortly." }, 503);
  }
  if (operation === "login") return json({ error: "We couldn’t log you in. Check your email and password. If you haven’t confirmed your email, use the confirmation link in your inbox or request a new one." }, 401);
  if (operation === "signup" && error?.code === "weak_password") return json({ error: "Choose a stronger password with at least 12 characters. Avoid common or previously exposed passwords." }, 400);
  if (operation === "verify" && error?.code === "otp_expired") return json({ error: "This confirmation link is invalid or has expired. Request a new confirmation email, or try logging in if you already confirmed your email." }, 400);
  return json({ error: operation === "verify" ? "We couldn’t confirm your email. Please try again shortly. If that doesn’t work, request a new confirmation email or try logging in." : "We couldn’t complete your request. Please try again shortly." }, 400);
}

// Defense in depth for this process. Supabase Auth also enforces provider-side limits.
// Multi-instance deployments should additionally configure a shared edge rate limiter.
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id);
  const previous = attempts.get(key);
  if (previous && previous.count >= limit) throw new InputError("Too many attempts. Please wait a minute and try again.", 429);
  if (!previous && attempts.size >= 10_000) throw new InputError("Please try again shortly.", 429);
  attempts.set(key, { count: (previous?.count || 0) + 1, until: previous?.until || now + windowMs });
}
