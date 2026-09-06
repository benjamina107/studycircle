import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestApplicationOrigin, calPolyEmail } from "../validation";
import { apiError } from "../_utils";

export async function GET(request: Request) {
  let origin: string;
  try { origin = requestApplicationOrigin(request); }
  catch (error) { return apiError(error); }
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") || "email";
  // Legacy redirect targets can receive the new template too. Never consume a
  // one-time token during GET: email scanners and previews follow links.
  if (tokenHash && /^[a-zA-Z0-9_-]{20,256}$/.test(tokenHash) && ["email","signup"].includes(type)) {
    const target=new URL("/verify",origin);target.searchParams.set("token_hash",tokenHash);target.searchParams.set("type",type);
    return NextResponse.redirect(target,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
  }
  const code = params.get("code");
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
