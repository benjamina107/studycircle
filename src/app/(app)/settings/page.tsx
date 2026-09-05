"use client";

import { useState } from "react";

// Notification settings — email-based, configurable per event, with a test
// button that sends a confirmation email (spec §6.7).
const events = [
  { key: "MEETUP_JOIN", label: "Someone joins your meetup" },
  { key: "NEW_MESSAGE", label: "New message" },
  { key: "MENTION", label: "Mentions" },
  { key: "EXAM_REMINDER", label: "Exam reminders" },
];

export default function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null);

  async function sendTest() {
    setStatus("Sending…");
    const res = await fetch("/api/notifications/test", { method: "POST" });
    setStatus(res.ok ? "Sent! Check your inbox." : "Not wired up yet.");
  }

  return (
    <main>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>
      <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
        Email notifications
      </h2>
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li
            key={event.key}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-sm">{event.label}</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-emerald-600" />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={sendTest}
        className="mt-4 w-full rounded-lg border border-emerald-600 py-2 font-medium text-emerald-600"
      >
        Send test notification
      </button>
      {status && (
        <p className="mt-2 text-center text-sm text-zinc-500">{status}</p>
      )}
    </main>
  );
}
