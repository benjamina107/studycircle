// Meetup card — spec §6.4: creator's picture, stack of joined avatars, Join
// button. A meetup is a location + time posting, not a chat.

interface MeetupCardProps {
  title: string;
  blurb?: string | null;
  locationName: string;
  startsAt: string;
  creatorName: string;
  attendeeCount: number;
}

export default function MeetupCard({
  title,
  blurb,
  locationName,
  startsAt,
  creatorName,
  attendeeCount,
}: MeetupCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {blurb && <p className="mt-0.5 text-sm text-zinc-500">{blurb}</p>}
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            📍 {locationName} · 🕒 {startsAt}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {creatorName} · {attendeeCount} going
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white"
        >
          Join
        </button>
      </div>
    </div>
  );
}
