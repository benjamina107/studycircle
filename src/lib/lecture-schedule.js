const WEEKDAY_CODES = ["U", "M", "T", "W", "R", "F", "S"];

/** Derive local teaching dates from an explicit inclusive term range. */
export function teachingDates(startsOn, endsOn, meetingDays, excludedDates) {
  const days = meetingDays.toUpperCase();
  if (!/^[MTWRFSU]+$/.test(days)) return [];
  const excluded = new Set(excludedDates);
  const start = new Date(`${startsOn}T12:00:00Z`);
  const end = new Date(`${endsOn}T12:00:00Z`);
  const dates = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const iso = date.toISOString().slice(0, 10);
    if (days.includes(WEEKDAY_CODES[date.getUTCDay()]) && !excluded.has(iso)) dates.push(iso);
  }
  return dates;
}
