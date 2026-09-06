import { createClient } from "@/lib/supabase/server";
import { apiError, authFailure, json, rateLimit } from "../_utils";
import { assertSameOrigin, calPolyEmail, readJson } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const supabase = await createClient();
    let result;
    if ('code' in body) {
      const email = calPolyEmail(body.email);
      if (typeof body.code !== "string" || !/^[0-9]{6}$/.test(body.code)) return json({ error: "Enter the six-digit code from your email." }, 400);
      rateLimit(`verify-code:${email}`, 5);
      result = await supabase.auth.verifyOtp({ email, token: body.code, type: "signup" });
    } else {
      // Previously sent links remain valid during the transition.
      if (typeof body.token_hash !== "string" || !/^[a-zA-Z0-9_-]{20,256}$/.test(body.token_hash) || !["signup", "email"].includes(String(body.type))) return json({ error: "Enter the six-digit code from your email." }, 400);
      result = await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: body.type as "signup" | "email" });
    }
    const { data, error } = result;
    if (error || !data.user?.email_confirmed_at) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return "code" in body && error?.status !== 429 && (error?.status ?? 400) < 500 ? json({error:"That code is invalid or has expired. Check your email for the newest code or resend it."},400) : authFailure(error, "verify");
    }
    try { calPolyEmail(data.user.email); } catch {
      await supabase.auth.signOut({ scope: "local" });
      return json({ error: "StudyCircle requires a Cal Poly email address. Sign up with your @calpoly.edu email." }, 403);
    }
    return json({ next: "/profile" });
  } catch (error) { return apiError(error); }
}
