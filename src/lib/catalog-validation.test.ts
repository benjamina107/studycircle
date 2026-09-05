import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateCatalog, CatalogValidationError } from "./catalog-validation";

const fixture = () => JSON.parse(readFileSync(new URL("../../docs/catalog-demo.json", import.meta.url), "utf8"));

test("fictional fixture groups multiple sections under stable professor keys", () => {
  const result = validateCatalog(fixture());
  assert.equal(result.source.kind, "demo");
  assert.equal(result.courses[0].sections.length, 3);
  assert.equal(new Set(result.courses[0].sections.map(s => s.professor_key)).size, 2);
});

test("normalizes codes and whitespace without mutating input", () => {
  const input = fixture(); input.courses[0].code = " demo 101 ";
  input.courses[0].sections[0].days = "mwf";
  const result = validateCatalog(input);
  assert.equal(result.courses[0].code, "DEMO 101");
  assert.equal(result.courses[0].sections[0].days, "MWF");
  assert.equal(input.courses[0].code, " demo 101 ");
});

test("rejects impossible and reversed dates while allowing leap days", () => {
  for (const date of ["2026-02-29", "2026-13-01", "2026-1-01", "invalid"]) {
    const input = fixture(); input.starts_on = date;
    assert.throws(() => validateCatalog(input), CatalogValidationError);
  }
  const input = fixture(); input.starts_on = "2028-02-29"; input.ends_on = "2028-03-01";
  assert.doesNotThrow(() => validateCatalog(input));
  input.ends_on = "2028-02-28";
  assert.throws(() => validateCatalog(input), /ordered/);
});

test("requires a bounded teaching range", () => {
  const input = fixture(); input.ends_on = "2027-12-31";
  assert.throws(() => validateCatalog(input), /200 days/);
});

test("official source URLs reject spoofed domains and embedded credentials", () => {
  for (const url of ["https://calpoly.edu.evil.test", "https://evil.test/calpoly.edu", "http://calpoly.edu", "https://user:secret@calpoly.edu", null]) {
    const input = fixture(); input.source = { kind: "official", label: "Source", url };
    assert.throws(() => validateCatalog(input), /HTTPS/);
  }
  const input = fixture(); input.source = { kind: "official", label: "Source", url: "https://registrar.calpoly.edu/class-search" };
  assert.doesNotThrow(() => validateCatalog(input));
});

test("demo records cannot hide their fixture status", () => {
  const input = fixture(); input.term = "Fall 2026";
  assert.throws(() => validateCatalog(input), /Demo/);
});

test("duplicate course and section identities are rejected", () => {
  const input = fixture(); input.courses.push(structuredClone(input.courses[0]));
  assert.throws(() => validateCatalog(input), /duplicated/);
  input.courses.pop(); input.courses[0].sections[1].section_code = "01";
  assert.throws(() => validateCatalog(input), /duplicated/);
});

test("professor keys cannot refer to different names across courses", () => {
  const input = fixture(); input.courses[0].sections[1].professor_name = "Different person";
  assert.throws(() => validateCatalog(input), /conflicting names/);
});

test("meeting days require normalized unique weekdays or explicit TBA", () => {
  for (const days of ["", "MM", "WM", "TuTh", "Monday"]) {
    const input = fixture(); input.courses[0].sections[0].days = days;
    assert.throws(() => validateCatalog(input), CatalogValidationError);
  }
  const input = fixture(); input.courses[0].sections[0].days = "TBA";
  assert.doesNotThrow(() => validateCatalog(input));
});

test("meeting times must be a valid ordered pair or both absent", () => {
  for (const times of [["24:00", "25:00"], ["11:00", "10:00"], ["09:00", null], ["09:00", "09:00"]]) {
    const input = fixture(); [input.courses[0].sections[0].start_time, input.courses[0].sections[0].end_time] = times;
    assert.throws(() => validateCatalog(input), /HH:MM/);
  }
  const input = fixture(); delete input.courses[0].sections[0].start_time; delete input.courses[0].sections[0].end_time;
  assert.equal(validateCatalog(input).courses[0].sections[0].start_time, null);
});

test("rejects malformed structure and excessive collections", () => {
  for (const input of [null, [], {}, { ...fixture(), version: 2 }, { ...fixture(), courses: [] }]) {
    assert.throws(() => validateCatalog(input), CatalogValidationError);
  }
  const input = fixture(); input.courses[0].sections = Array(301).fill(input.courses[0].sections[0]);
  assert.throws(() => validateCatalog(input), /300/);
});
