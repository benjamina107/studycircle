import { createClient } from "@/lib/supabase/server";
import { apiError, authFailure, json, rateLimit } from "../_utils";
import { requestApplicationOrigin, assertSameOrigin, calPolyEmail, readJson } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const email = calPolyEmail((await readJson(request)).email);
    rateLimit(`resend:${email}`, 1);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${requestApplicationOrigin(request)}/verify` } });
    // Missing or already-confirmed accounts receive the same response as accepted requests.
    if (error && !["user_not_found", "email_not_confirmed", "email_exists", "user_already_exists"].includes(error.code || "")) return authFailure(error, "resend");
    return json({ message: "Check your inbox and spam folder for a new six-digit confirmation code. If you already confirmed your email, try logging in. If you haven’t signed up yet, create an account." });
  } catch (error) { return apiError(error); }
}
