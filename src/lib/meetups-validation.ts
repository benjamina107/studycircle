export const CAMPUS_TIME_ZONE = "America/Los_Angeles";
export const MEETUP_LIMITS = { title: 80, blurb: 500, location: 120 } as const;

export type MeetupDraft = {
  title: string;
  blurb: string;
  location: string;
  latitude: string;
  longitude: string;
  date: string;
  time: string;
};
export type MeetupErrors = Partial<Record<keyof MeetupDraft, string>>;
export type MeetupDetails = {
  title: string;
  blurb: string;
  location: string;
  latitude: number;
  longitude: number;
  startsAt: string;
};

const campusParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function partsAt(timestamp: number) {
  const parts = Object.fromEntries(campusParts.formatToParts(timestamp).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function campusDateTime(timestamp: number) {
  return partsAt(timestamp);
}

/** Resolve a wall clock in campus time, rejecting DST gaps and repeated hours. */
export function resolveCampusTime(date: string, time: string): number[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return [];
  const [year, month, day] = date.split("-").map(Number);
  if (year < 2000) return [];
  const [hour, minute] = time.split(":").map(Number);
  const nominal = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(nominal).toISOString().slice(0, 10) !== date) return [];
  const offsets = new Set<number>();
  // Sample both sides of a transition, using Intl's timezone database.
  for (const delta of [-36, 0, 36]) {
    const instant = nominal + delta * 3_600_000;
    const local = partsAt(instant);
    offsets.add(Date.parse(`${local.date}T${local.time}:00Z`) - instant);
  }
  return [...offsets].map(offset => nominal - offset).filter(instant => {
    const local = partsAt(instant);
    return local.date === date && local.time === time;
  }).sort((a, b) => a - b);
}

export function validateMeetup(draft: MeetupDraft, now: number):
  { ok: true; value: MeetupDetails } | { ok: false; errors: MeetupErrors } {
  const errors: MeetupErrors = {};
  for (const key of ["title", "location", "blurb"] as const) {
    if (key !== "blurb" && !draft[key].trim()) errors[key] = `Enter a ${key}.`;
    else if (draft[key].trim().length > MEETUP_LIMITS[key]) errors[key] = `Use at most ${MEETUP_LIMITS[key]} characters.`;
  }
  for (const [key, max] of [["latitude", 90], ["longitude", 180]] as const) {
    const raw = draft[key].trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || !Number.isFinite(Number(raw)) || Math.abs(Number(raw)) > max) {
      errors[key] = `Enter a decimal coordinate from −${max} to ${max}.`;
    }
  }
  if (!draft.date) errors.date = "Choose a date in campus time.";
  if (!draft.time) errors.time = "Choose a time in campus time.";
  const matches = resolveCampusTime(draft.date, draft.time);
  if (draft.date && draft.time) {
    if (matches.length === 0) errors.time = "Enter a valid date and time. This time may not exist during the spring clock change.";
    else if (matches.length > 1) errors.time = "This time occurs twice during the fall clock change. Choose a time outside the repeated hour.";
    else if (!Number.isFinite(now) || matches[0] <= now) errors.time = "Choose a future date and time in campus time.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: {
    title: draft.title.trim(), blurb: draft.blurb.trim(), location: draft.location.trim(),
    latitude: Number(draft.latitude), longitude: Number(draft.longitude), startsAt: new Date(matches[0]).toISOString(),
  } };
}
