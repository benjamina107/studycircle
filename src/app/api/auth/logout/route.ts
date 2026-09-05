import { createClient } from "@/lib/supabase/server";
import { apiError, json } from "../_utils";
import { assertSameOrigin } from "../validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return json({ error: "Could not log out. Please try again." }, 503);
    return json({ next: "/login" });
  } catch (error) { return apiError(error); }
}
