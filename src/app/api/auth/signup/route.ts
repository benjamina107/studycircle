import { createClient } from "@/lib/supabase/server";
import { apiError, authFailure, json, rateLimit } from "../_utils";
import { requestApplicationOrigin, assertSameOrigin, calPolyEmail, passwordInput, readJson, textInput } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = calPolyEmail(body.email);
    const password = passwordInput(body.password, true);
    const name = textInput(body.name, "Name", 100, true);
    rateLimit(`signup:${email}`, 3);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: `${requestApplicationOrigin(request)}/verify` },
    });
    // Match the accepted response for existing accounts to avoid revealing membership.
    if (error && !["user_already_exists", "email_exists"].includes(error.code || "")) return authFailure(error, "signup");
    // Fail closed when a project accidentally disables email confirmation.
    if (!error && data.session) {
      await supabase.auth.signOut({ scope: "local" });
      return json({ error: "Signup is currently unavailable. Please try again later." }, 503);
    }
    return json({ message: "Check your inbox and spam folder for a confirmation email. If you find one, open the link to confirm your email. If you already have an account, try logging in.", next: "/verify" }, 202);
  } catch (error) { return apiError(error); }
}
