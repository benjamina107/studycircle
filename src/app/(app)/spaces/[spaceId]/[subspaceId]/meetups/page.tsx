import { redirect } from "next/navigation";
import MeetupCard from "@/components/MeetupCard";
import { createClient } from "@/lib/supabase/server";
import { createMeetupAction, joinMeetupAction, leaveMeetupAction, removeAttendeeAction } from "./actions";

type MeetupRow = {
  id: string; title: string; blurb: string | null; location_name: string; lat: number | null; lng: number | null;
  starts_at: string; time_zone: string; creator_id: string;
  creator: { id: string; name: string; avatar_url: string | null } | null;
  meetup_attendees: { user_id: string; profile: { name: string; avatar_url: string | null } | null }[];
};

export default async function MeetupsPage(props: PageProps<"/spaces/[spaceId]/[subspaceId]/meetups">) {
  const { spaceId, subspaceId } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("meetups").select(`
    id, title, blurb, location_name, lat, lng, starts_at, time_zone, creator_id,
    creator:profiles!meetups_creator_id_fkey(id, name, avatar_url),
    meetup_attendees(user_id, profile:profiles!meetup_attendees_user_id_fkey(name, avatar_url))
  `).eq("subspace_id", subspaceId).gt("starts_at", new Date().toISOString()).order("starts_at");
  if (error) throw new Error(error.message);
  const meetups = (data ?? []) as unknown as MeetupRow[];

  return (
    <main className="flex flex-col gap-3">
      <details className="rounded-xl border-2 border-dashed border-zinc-300 p-3 dark:border-zinc-700"><summary className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-300">+ Create meetup</summary>
        <form action={createMeetupAction.bind(null, spaceId, subspaceId)} className="mt-3 flex flex-col gap-2">
          <input required name="title" maxLength={100} placeholder="Study session title" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          <textarea name="blurb" maxLength={500} placeholder="What are you working on? (optional)" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          <input required name="locationName" maxLength={140} placeholder="Location name" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          <div className="grid grid-cols-2 gap-2"><input name="lat" type="number" step="any" min="-90" max="90" placeholder="Pin latitude" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /><input name="lng" type="number" step="any" min="-180" max="180" placeholder="Pin longitude" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></div>
          <input required name="startsAt" type="datetime-local" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          <input required name="timeZone" defaultValue="America/Los_Angeles" placeholder="IANA time zone" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
          <button className="rounded-lg bg-emerald-600 py-2 font-medium text-white">Post meetup</button>
        </form>
      </details>
      {meetups.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No upcoming meetups yet.</p>}
      {meetups.map((meetup) => (
        <MeetupCard key={meetup.id} title={meetup.title} blurb={meetup.blurb} locationName={meetup.location_name} lat={meetup.lat} lng={meetup.lng} startsAt={meetup.starts_at} timeZone={meetup.time_zone} creatorId={meetup.creator_id} creatorName={meetup.creator?.name || "Classmate"} creatorAvatarUrl={meetup.creator?.avatar_url || null} attendees={meetup.meetup_attendees.map((attendee) => ({ userId: attendee.user_id, name: attendee.profile?.name || "Classmate", avatarUrl: attendee.profile?.avatar_url || null }))} currentUserId={user.id} joinAction={joinMeetupAction.bind(null, spaceId, subspaceId, meetup.id)} leaveAction={leaveMeetupAction.bind(null, spaceId, subspaceId, meetup.id)} removeAttendeeAction={removeAttendeeAction.bind(null, spaceId, subspaceId, meetup.id)} />
      ))}
    </main>
  );
}
