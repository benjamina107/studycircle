import type { MeetupChange, MeetupPerson, MeetupRecord } from "@/lib/meetups-demo";
import { CAMPUS_TIME_ZONE } from "@/lib/meetups-validation";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE, weekday: "short", month: "short", day: "numeric",
  year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});

function Avatar({ person }: { person: MeetupPerson }) {
  return <span title={person.name} aria-label={person.name} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-xs font-bold text-emerald-900">{person.initials}</span>;
}

export default function MeetupDemoCard({ meetup, viewer, onChange }: {
  meetup: MeetupRecord; viewer: MeetupPerson; onChange: (change: MeetupChange) => void;
}) {
  const isHost = meetup.creator.id === viewer.id;
  const joined = meetup.participants.some(person => person.id === viewer.id);
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Avatar person={meetup.creator} />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{meetup.creator.name}</p><p className="text-xs text-stone-500">Fictional host{isHost ? " · You in this demo" : ""}</p></div>
        {joined && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{isHost ? "Hosting" : "Joined"}</span>}
      </div>
      <h3 className="break-words text-xl font-semibold tracking-tight">{meetup.title}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600">{meetup.blurb || "No extra details for this sample meetup."}</p>
      <div className="my-5 rounded-2xl bg-stone-50 p-4 text-sm">
        <time dateTime={meetup.startsAt} className="font-semibold">{dateFormat.format(new Date(meetup.startsAt))}</time>
        <p className="mt-2 break-words">⌖ {meetup.location}</p>
        <p className="mt-1 text-xs text-stone-500">Sample pin · {meetup.latitude.toFixed(5)}, {meetup.longitude.toFixed(5)}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><div className="flex -space-x-2">{meetup.participants.slice(0, 3).map(person => <Avatar key={person.id} person={person} />)}</div><span className="text-xs text-stone-600">{meetup.participants.length} going</span></div>
        {!isHost && <button type="button" onClick={() => onChange({ kind: joined ? "leave" : "join" })} className="min-h-11 rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">{joined ? "Leave sample meetup" : "Join sample meetup"}</button>}
      </div>
      {isHost && <details className="mt-4 border-t border-stone-100 pt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-emerald-900">Manage sample participants</summary>
        <ul className="space-y-2">{meetup.participants.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{person.name}</span>{person.id === viewer.id ? <span className="text-xs text-stone-500">Host · stays joined</span> : <button type="button" aria-label={`Remove ${person.name} from ${meetup.title}`} onClick={() => onChange({ kind: "remove", participantId: person.id })} className="min-h-11 rounded-lg px-3 text-rose-800 hover:bg-rose-50">Remove</button>}</li>)}</ul>
      </details>}
    </article>
  );
}
