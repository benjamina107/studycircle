import { NextResponse } from "next/server";
import { EmailProviderError, sendTestEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

// Backs the "Send test notification" button (spec §6.7).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in to send a test notification." }, { status: 401 });
  try {
    const result = await sendTestEmail(user.email);
    return NextResponse.json({ accepted: true, id: result.id, message: "Provider accepted the test notification. Inbox delivery is not guaranteed." }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test notification failed.";
    return NextResponse.json({ error: message }, { status: error instanceof EmailProviderError ? 503 : 502 });
  }
}
