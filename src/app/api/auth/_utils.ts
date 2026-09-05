import { InputError } from "./validation";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export function apiError(error: unknown) {
  if (error instanceof InputError) return json({ error: error.message }, error.status);
  return json({ error: "The service is unavailable. Please try again shortly." }, 503);
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
