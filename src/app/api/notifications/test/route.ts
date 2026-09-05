import { NextResponse } from "next/server";

// Backs the "Send test notification" button (spec §6.7).
// TODO(email): call sendTestEmail(user.email) once auth + email exist.
export async function POST() {
  return NextResponse.json(
    { error: "Email sending not implemented yet" },
    { status: 501 }
  );
}
