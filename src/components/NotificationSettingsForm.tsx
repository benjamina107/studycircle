"use client";

import { useState } from "react";
import { saveNotificationSettings } from "@/app/(app)/settings/actions";

const LABELS = {
  MEETUP_JOIN: "Someone joins your meetup",
  NEW_MESSAGE: "New class messages",
  MENTION: "Someone mentions you",
  EXAM_REMINDER: "Exam reminders",
} as const;

export default function NotificationSettingsForm({ enabled }: { enabled: Record<keyof typeof LABELS, boolean> }) {
  const [status, setStatus] = useState<string | null>(null);
  async function save(formData: FormData) {
    try { await saveNotificationSettings(formData); setStatus("Settings saved."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Settings could not be saved."); }
  }
  async function test() {
    setStatus(null);
    const response = await fetch("/api/notifications/test", { method: "POST" });
    const body = await response.json();
    setStatus(response.ok ? body.message : body.error || "Test notification failed.");
  }
  return <section className="workspace-panel"><form action={save} className="flex flex-col gap-3"><fieldset><legend className="workspace-section-title">Email notifications</legend>{Object.entries(LABELS).map(([event, label]) => <label key={event} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{label}</span><input name={event} type="checkbox" defaultChecked={enabled[event as keyof typeof LABELS]} /></label>)}</fieldset><button className="workspace-button">Save settings</button></form><div className="mt-4 border-t notification-test pt-4"><button type="button" onClick={test} className="workspace-secondary">Send test notification</button>{status && <p role="status" className="mt-2 text-sm notification-status">{status}</p>}</div></section>;
}
