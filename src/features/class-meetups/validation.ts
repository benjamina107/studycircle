import { MEETUP_LIMITS, resolveCampusTime } from "@/lib/meetups-validation";

export type Draft = { title: string; blurb: string; location: string; date: string; time: string };
export type Result = { ok: boolean; message: string; errors?: Partial<Record<keyof Draft, string>> };
export const emptyDraft: Draft = { title: "", blurb: "", location: "", date: "", time: "" };

export function validateCreation(form: FormData, now: number):
  { ok: true; value: { title: string; blurb: string; location_name: string; starts_at: string } } |
  { ok: false; errors: NonNullable<Result["errors"]> } {
  const errors: NonNullable<Result["errors"]> = {};
  const draft = { ...emptyDraft };
  for (const key of Object.keys(draft) as (keyof Draft)[]) {
    const values = form.getAll(key);
    if (values.length !== 1 || typeof values[0] !== "string") errors[key] = "Enter a valid value.";
    else draft[key] = values[0].trim();
  }
  for (const key of ["title", "blurb", "location"] as const) {
    if (key !== "blurb" && !draft[key]) errors[key] = `Enter a ${key}.`;
    if (draft[key].length > MEETUP_LIMITS[key]) errors[key] = `Use at most ${MEETUP_LIMITS[key]} characters.`;
  }
  if (!draft.date) errors.date = "Choose a date in campus time.";
  const matches = resolveCampusTime(draft.date, draft.time);
  if (matches.length === 0) errors.time = "Choose a valid campus date and time; spring clock-change gaps are unavailable.";
  else if (matches.length > 1) errors.time = "This time occurs twice during the fall clock change. Choose another hour.";
  else if (!Number.isFinite(now) || matches[0] <= now) errors.time = "Choose a future date and time in campus time.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title: draft.title, blurb: draft.blurb, location_name: draft.location, starts_at: new Date(matches[0]).toISOString() } };
}
