import assert from "node:assert/strict";
import { test } from "node:test";
import { addDemoMeetup, changeMeetup, makeMeetupsDemo } from "./meetups-demo";

const now = Date.parse("2026-09-05T19:00:00Z");

test("joining is idempotent, leaving works, fixtures stay unchanged", () => {
  const { meetups, viewer } = makeMeetupsDemo(now);
  const joined = changeMeetup(meetups, "demo-review", viewer, { kind: "join" }, now);
  assert.equal(joined[0].participants.length, 3);
  assert.equal(meetups[0].participants.length, 2);
  assert.equal(changeMeetup(joined, "demo-review", viewer, { kind: "join" }, now)[0].participants.length, 3);
  assert.equal(changeMeetup(joined, "demo-review", viewer, { kind: "leave" }, now)[0].participants.length, 2);
});

test("only the host can remove participants, and the host cannot leave", () => {
  const { meetups, viewer } = makeMeetupsDemo(now);
  assert.throws(() => changeMeetup(meetups, "demo-review", viewer, { kind: "remove", participantId: "demo-morgan" }, now), /Only the sample host/);
  assert.throws(() => changeMeetup(meetups, "demo-owned", viewer, { kind: "leave" }, now), /host stays/);
  assert.throws(() => changeMeetup(meetups, "demo-owned", viewer, { kind: "remove", participantId: viewer.id }, now), /host stays/);
  const removed = changeMeetup(meetups, "demo-owned", viewer, { kind: "remove", participantId: "demo-morgan" }, now);
  assert.equal(removed[1].participants.length, 1);
  assert.equal(meetups[1].participants.length, 2);
  assert.throws(() => changeMeetup(removed, "demo-owned", viewer, { kind: "remove", participantId: "demo-morgan" }, now), /no longer/);
});

test("missing or started meetups produce explicit errors", () => {
  const { meetups, viewer } = makeMeetupsDemo(now);
  assert.throws(() => changeMeetup(meetups, "missing", viewer, { kind: "join" }, now), /no longer/);
  assert.throws(() => changeMeetup(meetups, "demo-review", viewer, { kind: "join" }, now + 86_400_000), /started/);
});

test("create includes the host once, sorts by time, and fresh fixtures reset changes", () => {
  const { meetups, viewer } = makeMeetupsDemo(now);
  const { title, blurb, location, latitude, longitude } = meetups[0];
  const details = { title, blurb, location, latitude, longitude, startsAt: new Date(now + 3_600_000).toISOString() };
  const created = addDemoMeetup(meetups, details, viewer, "demo-new");
  assert.equal(created[0].id, "demo-new");
  assert.deepEqual(created[0].participants, [viewer]);
  assert.equal(created[0].creator.id, viewer.id);
  assert.throws(() => addDemoMeetup(created, details, viewer, "demo-new"), /already exists/);
  assert.equal(makeMeetupsDemo(now).meetups.length, 2);
});
