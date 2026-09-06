import Link from "next/link";
import { redirect } from "next/navigation";
import NotificationSettingsForm from "@/components/NotificationSettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("notification_settings").select("event,email_enabled").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const enabled = Object.fromEntries(["MEETUP_JOIN", "NEW_MESSAGE", "MENTION", "EXAM_REMINDER"].map((event) => [event, data?.find((setting) => setting.event === event)?.email_enabled ?? true])) as Record<"MEETUP_JOIN" | "NEW_MESSAGE" | "MENTION" | "EXAM_REMINDER", boolean>;
  return <main>
    <Link href="/profile" className="workspace-back">← Profile</Link>
    <header className="page-heading"><h1>Notifications</h1><p>Email notification preferences.</p></header>
    <NotificationSettingsForm enabled={enabled} />
  </main>;
}
