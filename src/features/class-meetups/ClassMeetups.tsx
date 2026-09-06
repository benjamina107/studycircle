import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { meetupTime } from "@/lib/feed";
import { canAccessClass } from "./access";
import { ClassRsvp, CreateMeetup, OrganizerControls } from "./MeetupControls";
import styles from "./class-meetups.module.css";

type Meetup = { id: string; title: string; blurb: string | null; location_name: string; starts_at: string; creator_id: string; cancelled_at: string | null };

export default async function ClassMeetups({ spaceId, subspaceId }: { spaceId: string; subspaceId: string }) {
  const user = await requireUser();
  let meetups: Meetup[] = [];
  let attendees = new Map<string, string[]>();
  let failure = "";
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) {
      failure = "This class is unavailable. Refresh and check your enrollment.";
    } else {
      const result = await db.from("meetups").select("id,title,blurb,location_name,starts_at,creator_id,time_zone,cancelled_at")
        .eq("subspace_id", subspaceId).gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }).order("id", { ascending: true }).limit(100);
      if (result.error) throw new Error("read failed");
      meetups = result.data ?? [];
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
  return <section className={styles.screen} aria-label="Class meetups">
    <header className={styles.header}><h1>Meetups</h1><p>Study together with this class and professor.</p></header>
    {failure ? <p role="alert" className={styles.notice}>{failure}</p> : <>
      <CreateMeetup key={`${spaceId}:${subspaceId}`} spaceId={spaceId} subspaceId={subspaceId} />
      <h2>Upcoming meetups</h2>
      <p className={styles.hint}>Campus time · Pacific{meetups.length === 100 ? " · Showing the next 100 meetups" : ""}</p>
      {meetups.length === 0 ? <div className={styles.notice}><h3>No upcoming meetups yet</h3><p>Start a study session or plan a place to meet your classmates.</p></div>
        : <ul className={styles.feed}>{meetups.map(meetup => <li key={meetup.id}>
          <article className={styles.card}>
            <h3>{meetup.title}</h3>
            <time dateTime={meetup.starts_at}>{meetupTime(meetup.starts_at)}</time>
            <p className={styles.location}>{meetup.location_name}</p>
            {meetup.blurb && <p className={styles.blurb}>{meetup.blurb}</p>}
            <p className={styles.attendance} aria-label={`${attendees.get(meetup.id)?.length ?? 0} attendees`}>
              {attendees.get(meetup.id)?.length ?? 0} going
            </p>
            {meetup.cancelled_at ? <p className={styles.cancelled} role="status">Cancelled by the organizer</p>
              : meetup.creator_id === user.id
                ? <OrganizerControls spaceId={spaceId} subspaceId={subspaceId} meetup={meetup} />
                : <ClassRsvp spaceId={spaceId} subspaceId={subspaceId} meetupId={meetup.id} joined={attendees.get(meetup.id)?.includes(user.id) ?? false} hosting={false} />}
          </article>
        </li>)}</ul>}
    </>}
  </section>;
}
