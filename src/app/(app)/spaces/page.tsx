import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MeetupFeed from "@/components/MeetupFeed";
import { feedPage, type FeedMeetup } from "@/lib/feed";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string; show?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = feedPage(params.page);
  const past = params.show === "past";
  const db = await createClient();
  const { count: enrollmentCount, error: enrollmentError } = await db.from("enrollments").select("section_id", { count: "exact", head: true }).eq("user_id", user.id);
  const heading = <header className="page-heading feed-heading"><div><h1>Feed</h1><p>Meetups from your classes and professors.</p></div><Link className="workspace-secondary" href="/profile#classes">Manage classes</Link></header>;
  if (enrollmentError) return <main>{heading}<p role="alert">Your feed couldn’t be loaded. Please refresh and try again.</p></main>;
  if (!enrollmentCount) return <main>{heading}<section className="workspace-panel"><h2 className="workspace-section-title">No meetups to show yet</h2><p className="workspace-hint">Your feed shows meetups for the classes and professors selected in your profile.</p></section></main>;
  // eslint-disable-next-line react-hooks/purity -- Authenticated Server Component runs per request; capture one cutoff for this response.
  const now = Date.now();
  let query = db.from("meetups").select("id,title,blurb,location_name,starts_at,creator_id,subspaces!inner(professors!inner(name),spaces!inner(courses!inner(code,title,term)))", { count: "exact" });
  query = past ? query.lt("starts_at", new Date(now).toISOString()) : query.gte("starts_at", new Date(now).toISOString());
  // RLS filters every result by the viewer's enrolled course AND professor.
  const { data, error, count } = await query.order("starts_at", { ascending: !past }).order("id").range((page - 1) * 20, page * 20 - 1).returns<FeedMeetup[]>();
  const ids = (data || []).map(meetup => meetup.id);
  const attendance = ids.length ? await db.from("meetup_attendees").select("meetup_id").eq("user_id", user.id).in("meetup_id", ids) : { data: [], error: null };
  const url = (number: number) => `/spaces?show=${past ? "past" : "upcoming"}&page=${number}`;
  return <main>{heading}
    <nav className="feed-tabs" aria-label="Meetup dates"><Link href="/spaces" aria-current={!past ? "page" : undefined}>Upcoming</Link><Link href="/spaces?show=past" aria-current={past ? "page" : undefined}>Past</Link></nav>
    {error || attendance.error ? <p role="alert">Your meetups couldn’t be loaded. Please refresh and try again.</p> : data?.length ? <MeetupFeed meetups={data} joinedIds={(attendance.data || []).map(item => item.meetup_id)} userId={user.id} now={now} /> : <section className="workspace-panel"><h2 className="workspace-section-title">{page > 1 ? "No more meetups" : past ? "No past meetups" : "No upcoming meetups"}</h2><p className="workspace-hint">Meetup posts from your enrolled course and professor groups appear here.</p></section>}
    <nav className="feed-pagination" aria-label="Feed pages">{page > 1 && <Link className="workspace-secondary" href={url(page - 1)}>← Previous</Link>}{!error && (count || 0) > page * 20 && <Link className="workspace-secondary" href={url(page + 1)}>More meetups →</Link>}</nav>
  </main>;
}
