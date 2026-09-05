import { NextResponse } from "next/server";

// Backs the "Send test notification" button (spec §6.7).
// TODO(email): call sendTestEmail(user.email) once auth + email exist.
export async function POST() {
  return NextResponse.json(
    { error: "Test email is unavailable. No email was sent." },
    { status: 501 }
  );
}
