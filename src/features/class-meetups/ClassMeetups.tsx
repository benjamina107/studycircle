import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MeetupAgenda from "./MeetupAgenda";
import { canAccessClass } from "./access";
import styles from "./class-meetups.module.css";

type Meetup = {
  id: string; title: string; blurb: string | null; location_name: string;
  starts_at: string; creator_id: string; cancelled_at: string | null;
  meetup_attendees: { count: number }[];
};

export default async function ClassMeetups({ spaceId, subspaceId }: { spaceId: string; subspaceId: string }) {
  const user = await requireUser();
  let meetups: Meetup[] = [];
  const attendees = new Map<string, string[]>();
  let failure = "";
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) {
      failure = "This class is unavailable. Refresh and check your enrollment.";
    } else {
      // Upcoming sessions get their own limit so a long history cannot hide
      // the next event. Keep a compact recent history and all recent
      // cancellations for an explicit outcome to existing attendees.
      const fields = "id,title,blurb,location_name,starts_at,creator_id,cancelled_at,meetup_attendees(count)";
      const now = new Date().toISOString();
      const [upcoming, past, cancelled] = await Promise.all([
        db.from("meetups").select(fields).eq("subspace_id", subspaceId).gt("starts_at", now).order("starts_at", { ascending: true }).order("id", { ascending: true }).limit(100),
        db.from("meetups").select(fields).eq("subspace_id", subspaceId).lte("starts_at", now).order("starts_at", { ascending: false }).order("id", { ascending: true }).limit(25),
        db.from("meetups").select(fields).eq("subspace_id", subspaceId).not("cancelled_at", "is", null).order("cancelled_at", { ascending: false }).limit(25),
      ]);
      if (upcoming.error || past.error || cancelled.error) throw new Error("read failed");
      meetups = [...new Map([...upcoming.data ?? [], ...past.data ?? [], ...cancelled.data ?? []].map(meetup => [meetup.id, meetup])).values()];
      if (meetups.length) {
        const attendance = await db.from("meetup_attendees").select("meetup_id,user_id")
          .in("meetup_id", meetups.map(meetup => meetup.id));
        if (attendance.error) throw new Error("attendance failed");
        for (const row of attendance.data ?? []) {
          const id = row.meetup_id as string;
          attendees.set(id, [...(attendees.get(id) ?? []), row.user_id as string]);
        }
      }
    }
  } catch {
    failure = "Meetups couldn’t be loaded. Please refresh and try again.";
  }
  if(failure)return <section className={styles.screen}><header className={styles.header}><h1>Meetups</h1></header><p role="alert" className={styles.notice}>{failure}</p></section>;
  const joinedIds = new Set(
    [...attendees].filter(([, userIds]) => userIds.includes(user.id)).map(([meetupId]) => meetupId),
  );
  return <MeetupAgenda spaceId={spaceId} subspaceId={subspaceId} userId={user.id} meetups={meetups.map(m => ({
    ...m,
    joined: joinedIds.has(m.id),
    attendeeCount: m.meetup_attendees?.[0]?.count ?? 0,
  }))}/>;
}
