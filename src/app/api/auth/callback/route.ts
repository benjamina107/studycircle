import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applicationOrigin, calPolyEmail } from "../validation";
import { apiError } from "../_utils";

export async function GET(request: Request) {
  let origin: string;
  try { origin = applicationOrigin(request.url); }
  catch (error) { return apiError(error); }
  const code = new URL(request.url).searchParams.get("code");
  if (code && code.length < 2048) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at) {
        try {
          calPolyEmail(data.user.email);
          return NextResponse.redirect(new URL("/profile", origin), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
        } catch { /* Reject accounts outside the campus domain. */ }
      }
      if (data.session) await supabase.auth.signOut({ scope: "local" });
    } catch { /* Show a recoverable state without exposing provider details. */ }
  }
  return NextResponse.redirect(new URL("/verify?error=confirmation", origin), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
