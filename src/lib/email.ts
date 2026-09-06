// Email notifications — spec §6.7. Email-based (no push; no native app).
// Configurable per event in NotificationSetting. Stub until a provider
// (SMTP/Resend/SES) is chosen; read connection settings from env.

export type NotificationEvent =
  | "MEETUP_JOIN"
  | "NEW_MESSAGE"
  | "MENTION"
  | "EXAM_REMINDER";

export class EmailProviderError extends Error {}

function providerConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || from === "noreply@example.com") throw new EmailProviderError("Email sender is not configured. Set a verified EMAIL_FROM and RESEND_API_KEY.");
  return { apiKey, from };
}

export async function sendVerificationEmail(_to: string, _token: string): Promise<void> {
  throw new Error("Not implemented: verification email");
}

export async function sendNotificationEmail(options: {
  to: string;
  event: NotificationEvent;
  subject: string;
  body: string;
}): Promise<{ accepted: true; id: string }> {
  const { apiKey, from } = providerConfig();
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: options.to, subject: options.subject, text: options.body }) });
  const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (!response.ok || !body?.id) throw new EmailProviderError(body?.message || `Email provider rejected the request (${response.status}).`);
  return { accepted: true, id: body.id };
}

/** Backs the "Test notification" button in Settings (spec §6.7). */
export async function sendTestEmail(to: string): Promise<{ accepted: true; id: string }> {
  return sendNotificationEmail({ to, event: "MENTION", subject: "StudyCircle test notification", body: "Your email provider accepted this StudyCircle test notification. This is not confirmation of inbox delivery." });
}
