type Attendee = { userId: string; name: string; avatarUrl: string | null };

type MeetupCardProps = {
  title: string; blurb: string | null; locationName: string; lat: number | null; lng: number | null;
  startsAt: string; timeZone: string; creatorName: string; creatorAvatarUrl: string | null; creatorId: string;
  attendees: Attendee[]; currentUserId: string;
  joinAction: () => Promise<void>; leaveAction: () => Promise<void>; removeAttendeeAction: (attendeeId: string) => Promise<void>;
};

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) return <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />;
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">{name.slice(0, 1).toUpperCase() || "?"}</span>;
}

export default function MeetupCard({ title, blurb, locationName, lat, lng, startsAt, timeZone, creatorName, creatorAvatarUrl, creatorId, attendees, currentUserId, joinAction, leaveAction, removeAttendeeAction }: MeetupCardProps) {
  const joined = attendees.some((attendee) => attendee.userId === currentUserId);
  const isCreator = creatorId === currentUserId;
  const mapsQuery = lat !== null && lng !== null ? `${lat},${lng}` : locationName;
  const startsAtLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(startsAt));

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0">
        <h3 className="font-semibold">{title}</h3>
        {blurb && <p className="mt-0.5 text-sm text-zinc-500">{blurb}</p>}
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"><a className="underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`} target="_blank" rel="noreferrer">📍 {locationName}</a>{lat !== null && lng !== null && " · map pin"}<br />🕒 {startsAtLabel} ({timeZone})</p>
      </div>{!isCreator && <form action={joined ? leaveAction : joinAction}><button className="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">{joined ? "Leave" : "Join"}</button></form>}</div>
      <div className="mt-3 flex items-center gap-2"><Avatar name={creatorName} src={creatorAvatarUrl} /><p className="text-xs text-zinc-500">Hosted by {creatorName} · {attendees.length} going</p></div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Attendees">{attendees.map((attendee) => <div key={attendee.userId} className="flex items-center gap-1"><Avatar name={attendee.name} src={attendee.avatarUrl} />{isCreator && attendee.userId !== currentUserId && <form action={removeAttendeeAction.bind(null, attendee.userId)}><button aria-label={`Remove ${attendee.name}`} className="text-xs text-rose-600 underline">Remove</button></form>}</div>)}</div>
    </article>
  );
}
