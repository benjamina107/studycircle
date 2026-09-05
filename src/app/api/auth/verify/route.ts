import { createClient } from "@/lib/supabase/server";
import { apiError, json } from "../_utils";
import { assertSameOrigin, calPolyEmail, readJson } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (typeof body.token_hash !== "string" || !/^[a-zA-Z0-9_-]{20,256}$/.test(body.token_hash) || !["signup", "email"].includes(String(body.type))) {
      return json({ error: "This confirmation link is invalid. Request a new link." }, 400);
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: body.type as "signup" | "email" });
    if (error || !data.user?.email_confirmed_at) return json({ error: error?.code === "otp_expired"
      ? "This confirmation link is invalid or has expired. Request a new confirmation email, or try logging in if you already confirmed your email."
      : "We couldn’t confirm your email. Please try again shortly. If that doesn’t work, request a new confirmation email or try logging in." }, 400);
    try { calPolyEmail(data.user.email); } catch {
      await supabase.auth.signOut({ scope: "local" });
      return json({ error: "StudyCircle requires a Cal Poly email address. Sign up with your @calpoly.edu email." }, 403);
    }
    return json({ next: "/profile" });
  } catch (error) { return apiError(error); }
}
