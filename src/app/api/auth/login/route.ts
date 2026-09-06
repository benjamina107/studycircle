import { createClient } from "@/lib/supabase/server";
import { apiError, authFailure, json, rateLimit } from "../_utils";
import { assertSameOrigin, calPolyEmail, passwordInput, readJson } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = calPolyEmail(body.email);
    const password = passwordInput(body.password);
    rateLimit(`login:${email}`);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email_confirmed_at) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return authFailure(error, "login");
    }
    return json({ next: "/profile" });
  } catch (error) { return apiError(error); }
}
