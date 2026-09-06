'use client';

import { useEffect, useState } from 'react';
import { ClassRsvp, CreateMeetup, OrganizerControls } from './MeetupControls';
import styles from './class-meetups.module.css';

type Meetup = {
  id: string; title: string; blurb: string | null; location_name: string;
  starts_at: string; creator_id: string; cancelled_at: string | null;
  joined: boolean; attendeeCount: number;
};

const date = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', ...options,
}).format(new Date(value));

export default function MeetupAgenda({ spaceId, subspaceId, userId, meetups }: {
  spaceId: string; subspaceId: string; userId: string; meetups: Meetup[];
}) {
  const [filter, setFilter] = useState<'all' | 'going' | 'hosting'>('all');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const isPast = (meetup: Meetup) => now !== 0 && !(Date.parse(meetup.starts_at) > now);
  const isUpcoming = (meetup: Meetup) => !meetup.cancelled_at && !isPast(meetup);
  const applies = (meetup: Meetup) => filter === 'all' || (filter === 'going' ? meetup.joined : meetup.creator_id === userId);
  const upcoming = meetups.filter(meetup => isUpcoming(meetup) && applies(meetup)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const history = meetups.filter(meetup => !isUpcoming(meetup) && (filter === 'all' || applies(meetup))).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));

  return <section className={styles.screen} aria-label="Class meetups">
    <header className={styles.header}><div><h1>Meetups</h1><p>Make time to study together.</p></div><CreateMeetup spaceId={spaceId} subspaceId={subspaceId}/></header>
    <div className={styles.toolbar}><div className={styles.filters} aria-label="Filter meetups">
      {([{ id: 'all', label: 'Upcoming' }, { id: 'going', label: 'Going' }, { id: 'hosting', label: 'Hosting' }] as const).map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
    </div><span className={styles.zone}>Pacific time</span></div>
    {!upcoming.length ? <EmptyState filter={filter} onExplore={() => setFilter('all')} /> : <MeetupList meetups={upcoming} spaceId={spaceId} subspaceId={subspaceId} userId={userId} isPast={isPast} />}
    {history.length > 0 && <section className={styles.history} aria-labelledby="meetup-history"><h2 id="meetup-history">Past and cancelled</h2><MeetupList meetups={history} spaceId={spaceId} subspaceId={subspaceId} userId={userId} isPast={isPast} /></section>}
    {meetups.length === 100 && <p className={styles.hint}>Showing the most recent 100 sessions.</p>}
  </section>;
}

function EmptyState({ filter, onExplore }: { filter: 'all' | 'going' | 'hosting'; onExplore: () => void }) {
  return <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">⌁</span><h2>{filter === 'all' ? 'Your next study session starts here' : filter === 'going' ? 'Nothing on your calendar yet' : 'Bring your class together'}</h2><p>{filter === 'all' ? 'Create a meetup and give your classmates a place to join you.' : filter === 'going' ? 'Join an upcoming meetup and you’ll find it here.' : 'Sessions you create will appear here.'}</p>{filter === 'going' && <button className={styles.textButton} onClick={onExplore}>Explore upcoming sessions</button>}</div>;
}

function MeetupList({ meetups, spaceId, subspaceId, userId, isPast }: { meetups: Meetup[]; spaceId: string; subspaceId: string; userId: string; isPast: (meetup: Meetup) => boolean }) {
  return <ul className={styles.feed}>{meetups.map((meetup, index) => {
    const month = date(meetup.starts_at, { month: 'long', year: 'numeric' });
    const previous = index ? date(meetups[index - 1].starts_at, { month: 'long', year: 'numeric' }) : null;
    return <li key={meetup.id}>{month !== previous && <h2 className={styles.month}>{month}</h2>}<MeetupCard meetup={meetup} spaceId={spaceId} subspaceId={subspaceId} userId={userId} past={isPast(meetup)} /></li>;
  })}</ul>;
}

function MeetupCard({ meetup, spaceId, subspaceId, userId, past }: { meetup: Meetup; spaceId: string; subspaceId: string; userId: string; past: boolean }) {
  const inactive = Boolean(meetup.cancelled_at) || past;
  const host = meetup.creator_id === userId;
  return <article className={`${styles.card}${inactive ? ` ${styles.inactiveCard}` : ''}`}>
    <div className={styles.dateTile} aria-hidden="true"><span>{date(meetup.starts_at, { weekday: 'short' })}</span><strong>{date(meetup.starts_at, { day: '2-digit' })}</strong><small>{date(meetup.starts_at, { month: 'short' })}</small></div>
    <div className={styles.details}><div className={styles.cardHeading}><time dateTime={meetup.starts_at}>{date(meetup.starts_at, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>{meetup.cancelled_at ? <span className={styles.cancelled}>Cancelled</span> : past ? <span className={styles.past}>Ended</span> : meetup.joined && !host ? <span className={styles.going}>Going</span> : null}</div>
      <h3>{meetup.title}</h3><p className={styles.location}>{meetup.location_name}</p>{meetup.blurb && <p className={styles.blurb}>{meetup.blurb}</p>}
      <footer className={styles.cardFooter}><span className={styles.attendance}>{meetup.attendeeCount} {meetup.attendeeCount === 1 ? 'person' : 'people'} {past ? 'attended' : 'going'}</span>
        {host ? <OrganizerControls spaceId={spaceId} subspaceId={subspaceId} meetup={meetup} inactive={inactive} /> : inactive ? <span className={styles.hint}>{meetup.cancelled_at ? 'This session is no longer happening.' : 'RSVPs are closed.'}</span> : <ClassRsvp spaceId={spaceId} subspaceId={subspaceId} meetupId={meetup.id} joined={meetup.joined} hosting={false} />}
      </footer>
    </div>
  </article>;
}
