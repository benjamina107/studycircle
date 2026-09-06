import { redirect } from "next/navigation";
import AppearanceSettings from "@/components/AppearanceSettings";
import NotificationSettingsForm from "@/components/NotificationSettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("notification_settings").select("event,email_enabled").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const enabled = Object.fromEntries(["MEETUP_JOIN", "NEW_MESSAGE", "MENTION", "EXAM_REMINDER"].map((event) => [event, data?.find((setting) => setting.event === event)?.email_enabled ?? true])) as Record<"MEETUP_JOIN" | "NEW_MESSAGE" | "MENTION" | "EXAM_REMINDER", boolean>;
  return <main className="settings-page">
    <header className="page-heading"><h1>Settings</h1><p>Personalize your appearance and email notifications.</p></header>
    <AppearanceSettings />
    <NotificationSettingsForm enabled={enabled} />
  </main>;
}
