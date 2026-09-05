import assert from "node:assert/strict";
import test from "node:test";
import { feedPage, recordId, meetupTime } from "./feed";

test("feed pagination rejects invalid or excessive values", () => {
  assert.equal(feedPage("2"), 2);
  for (const value of [undefined, "0", "-1", "1.5", "999999999", "oops", ["2"]]) assert.equal(feedPage(value), 1);
});
test("mutation IDs accept database identifiers but reject files and unsafe strings", () => {
  assert.equal(recordId("test-id_123"), "test-id_123");
  for (const value of [null, "", "a/b", "a".repeat(129), "id,other", new File([], "id")]) assert.equal(recordId(value), null);
});
test("meetup times explicitly use campus time, including daylight saving", () => {
  assert.match(meetupTime("2030-09-18T22:00:00Z"), /3:00 PM PDT/);
  assert.match(meetupTime("2030-01-18T22:00:00Z"), /2:00 PM PST/);
});
