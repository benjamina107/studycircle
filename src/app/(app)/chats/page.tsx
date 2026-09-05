import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type JoinedMeetup = {
  meetup: { id: string; title: string; location_name: string; starts_at: string; time_zone: string } | null;
};

// Joined meetups are shortcuts into the class, never a separate group chat.
export default async function ChatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("meetup_attendees")
    .select("meetup:meetups(id, title, location_name, starts_at, time_zone)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw new Error(error.message);
  const meetups = ((data ?? []) as unknown as JoinedMeetup[]).flatMap(({ meetup }) => meetup ? [meetup] : []);

  return (
    <main>
      <h1 className="mb-4 text-xl font-bold">Chats</h1>
      {meetups.length === 0 ? <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Join a class meetup and its location and time will appear here.</p> : <section><h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">Your meetups</h2><ul className="flex flex-col gap-2">{meetups.map((meetup) => <li key={meetup.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="font-semibold">{meetup.title}</p><p className="mt-1 text-zinc-500">📍 {meetup.location_name}<br />🕒 {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: meetup.time_zone }).format(new Date(meetup.starts_at))} ({meetup.time_zone})</p></li>)}</ul></section>}
    </main>
  );
}
