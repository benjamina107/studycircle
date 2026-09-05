import MeetupCard from "@/components/MeetupCard";
import { mockMeetups } from "@/lib/mock-data";

// Meetups tab — who's studying now / next, simple cards + create (spec §6.4).
// TODO(db): read meetups for this subspace; wire Join/create; rate limits TBD.
export default function MeetupsPage() {
  return (
    <main className="flex flex-col gap-3">
      <button
        type="button"
        className="rounded-xl border-2 border-dashed border-zinc-300 py-3 font-medium text-zinc-500 dark:border-zinc-700"
      >
        + Create meetup
      </button>
      {mockMeetups.map((meetup) => (
        <MeetupCard key={meetup.id} {...meetup} />
      ))}
    </main>
  );
}
