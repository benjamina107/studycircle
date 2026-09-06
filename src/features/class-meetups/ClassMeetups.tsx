import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MeetupAgenda from "./MeetupAgenda";
import { canAccessClass } from "./access";
import styles from "./class-meetups.module.css";

type Meetup = { id: string; title: string; blurb: string | null; location_name: string; starts_at: string; creator_id: string; meetup_attendees: {count:number}[] };

export default async function ClassMeetups({ spaceId, subspaceId }: { spaceId: string; subspaceId: string }) {
  const user = await requireUser();
  let meetups: Meetup[] = [];
  let joinedIds = new Set<string>();
  let failure = "";
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) {
      failure = "This class is unavailable. Refresh and check your enrollment.";
    } else {
      const result = await db.from("meetups").select("id,title,blurb,location_name,starts_at,creator_id,time_zone,meetup_attendees(count)")
        .eq("subspace_id", subspaceId).gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }).order("id", { ascending: true }).limit(100);
      if (result.error) throw new Error("read failed");
      meetups = result.data ?? [];
      if (meetups.length) {
        const attendance = await db.from("meetup_attendees").select("meetup_id")
          .eq("user_id", user.id).in("meetup_id", meetups.map(meetup => meetup.id));
        if (attendance.error) throw new Error("attendance failed");
        joinedIds = new Set((attendance.data ?? []).map(row => row.meetup_id as string));
      }
    }
  } catch {
    failure = "Meetups couldn’t be loaded. Please refresh and try again.";
  }
  if(failure)return <section className={styles.screen}><header className={styles.header}><h1>Meetups</h1></header><p role="alert" className={styles.notice}>{failure}</p></section>;
  return <MeetupAgenda spaceId={spaceId} subspaceId={subspaceId} userId={user.id} meetups={meetups.map(m=>({...m,joined:joinedIds.has(m.id),attendeeCount:m.meetup_attendees?.[0]?.count||0}))}/>;
}
