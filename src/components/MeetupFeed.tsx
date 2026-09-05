import { meetupTime, type FeedMeetup } from "@/lib/feed";
import FeedRsvp from "./FeedRsvp";

export default function MeetupFeed({ meetups, joinedIds, userId, now, preview = false }: { meetups: FeedMeetup[]; joinedIds: string[]; userId: string; now: number; preview?: boolean }) {
  return <div className="feed-list">{meetups.map(meetup => <article key={meetup.id} className="workspace-panel feed-post">
    <div className="feed-context"><span className="course-code">{meetup.subspaces.spaces.courses.code}</span><span>{meetup.subspaces.professors.name}</span><span>{meetup.subspaces.spaces.courses.term}</span></div>
    <h2>{meetup.title}</h2>
    <div className="feed-details"><time dateTime={meetup.starts_at}>{meetupTime(meetup.starts_at)}</time><span>{meetup.location_name}</span></div>
    {meetup.blurb && <p className="feed-description">{meetup.blurb}</p>}
    <footer>{preview ? <button className="workspace-button" disabled>RSVP · preview only</button> : <FeedRsvp id={meetup.id} joined={joinedIds.includes(meetup.id)} hosting={meetup.creator_id === userId} started={Date.parse(meetup.starts_at) <= now} />}</footer>
  </article>)}</div>;
}
