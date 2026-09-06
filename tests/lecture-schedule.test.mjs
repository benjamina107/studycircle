import { test } from "node:test";
import assert from "node:assert/strict";
import { teachingDates } from "../src/lib/lecture-schedule.js";

test("Fall 2026 MWF folders skip holidays and fall break", () => {
  const dates = teachingDates("2026-08-24", "2026-12-11", "MWF", ["2026-09-07", "2026-11-11", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
  assert.equal(dates.length, 43);
  assert.equal(dates.includes("2026-09-07"), false);
  assert.equal(dates.includes("2026-11-11"), false);
  assert.equal(dates.some((date) => date >= "2026-11-23" && date <= "2026-11-27"), false);
});

test("TBA and malformed meetings never create folders", () => {
  assert.deepEqual(teachingDates("2026-08-24", "2026-08-28", "TBA", []), []);
  assert.deepEqual(teachingDates("2026-08-24", "2026-08-28", "", []), []);
});
