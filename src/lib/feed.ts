export type ActionResult = { ok: boolean; message: string };
export type CourseSection = {
  id: string; section_code: string;
  courses: { code: string; title: string; term: string };
  professors: { name: string };
};
export type FeedMeetup = {
  id: string; title: string; blurb: string | null; location_name: string;
  starts_at: string; creator_id: string;
  subspaces: { professors: { name: string }; spaces: { courses: { code: string; title: string; term: string } } };
};
export function recordId(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : null;
}
export function feedPage(value: string | string[] | undefined) {
  return typeof value === "string" && /^\d{1,5}$/.test(value) ? Math.max(1, Number(value)) : 1;
}
export function meetupTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}
