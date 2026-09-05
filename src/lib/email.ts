// Email notifications — spec §6.7. Email-based (no push; no native app).
// Configurable per event in NotificationSetting. Stub until a provider
// (SMTP/Resend/SES) is chosen; read connection settings from env.

export type NotificationEvent =
  | "MEETUP_JOIN"
  | "NEW_MESSAGE"
  | "MENTION"
  | "EXAM_REMINDER";

export async function sendVerificationEmail(_to: string, _token: string): Promise<void> {
  throw new Error("Not implemented: verification email");
}

export async function sendNotificationEmail(_options: {
  to: string;
  event: NotificationEvent;
  subject: string;
  body: string;
}): Promise<void> {
  throw new Error("Not implemented: notification email");
}

/** Backs the "Test notification" button in Settings (spec §6.7). */
export async function sendTestEmail(_to: string): Promise<void> {
  throw new Error("Not implemented: test email");
}
