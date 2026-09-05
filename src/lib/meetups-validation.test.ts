import assert from "node:assert/strict";
import { test } from "node:test";
import { campusDateTime, resolveCampusTime, validateMeetup, type MeetupDraft } from "./meetups-validation";

const now = Date.parse("2026-09-05T19:00:00Z");
const draft = (): MeetupDraft => ({ title: " Review ", blurb: " Notes ", location: " Sample table ", latitude: "35.3", longitude: "-120.6", date: "2026-09-06", time: "15:00" });

test("campus clock resolves summer and winter independent of device timezone", () => {
  assert.deepEqual(resolveCampusTime("2026-09-06", "15:00"), [Date.parse("2026-09-06T22:00:00Z")]);
  assert.deepEqual(resolveCampusTime("2026-12-06", "15:00"), [Date.parse("2026-12-06T23:00:00Z")]);
  assert.deepEqual(campusDateTime(Date.parse("2026-09-07T02:00:00Z")), { date: "2026-09-06", time: "19:00" });
});

test("DST gaps and overlaps cannot silently choose the wrong instant", () => {
  assert.equal(resolveCampusTime("2027-03-14", "02:30").length, 0);
  assert.equal(resolveCampusTime("2026-11-01", "01:30").length, 2);
  const gap = validateMeetup({ ...draft(), date: "2027-03-14", time: "02:30" }, now);
  const overlap = validateMeetup({ ...draft(), date: "2026-11-01", time: "01:30" }, now);
  assert.equal(gap.ok, false);
  assert.equal(overlap.ok, false);
  if (!overlap.ok) assert.match(overlap.errors.time!, /twice/);
});

test("rejects impossible dates and malformed hours, accepts leap day and midnight", () => {
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "1999-01-01"]) assert.equal(resolveCampusTime(date, "15:00").length, 0);
  for (const time of ["24:00", "12:60", "9:00", "oops"]) assert.equal(resolveCampusTime("2026-09-06", time).length, 0);
  assert.equal(resolveCampusTime("2028-02-29", "00:00").length, 1);
});

test("trims details without changing the input and permits optional empty blurb", () => {
  const input = draft();
  const result = validateMeetup(input, now);
  assert.equal(result.ok, true);
  if (result.ok) { assert.equal(result.value.title, "Review"); assert.equal(result.value.longitude, -120.6); }
  assert.equal(input.title, " Review ");
  assert.equal(validateMeetup({ ...draft(), blurb: "" }, now).ok, true);
});

test("requires a strictly future instant, including the same minute", () => {
  for (const instant of ["2026-09-06T22:00:00Z", "2026-09-07T00:00:00Z"]) assert.equal(validateMeetup(draft(), Date.parse(instant)).ok, false);
  assert.equal(validateMeetup(draft(), Date.parse("2026-09-06T21:59:59Z")).ok, true);
});

test("rejects empty, oversized and invalid coordinate fields", () => {
  for (const patch of [
    { title: " " }, { location: "" }, { date: "" }, { time: "" },
    { title: "x".repeat(81) }, { blurb: "x".repeat(501) }, { location: "x".repeat(121) },
    { latitude: "" }, { latitude: "NaN" }, { latitude: "91" }, { longitude: "-181" },
    { latitude: "0x10" }, { longitude: "Infinity" }, { longitude: "1e2" },
  ]) assert.equal(validateMeetup({ ...draft(), ...patch }, now).ok, false, JSON.stringify(patch));
  assert.equal(validateMeetup({ ...draft(), latitude: "0", longitude: "0" }, now).ok, true);
  assert.equal(validateMeetup({ ...draft(), latitude: "-90", longitude: "180" }, now).ok, true);
});
