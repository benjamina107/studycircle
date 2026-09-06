import assert from "node:assert/strict";
import test from "node:test";
import { groupByCourse, meetingLabel } from "./class-catalog";
import type { CourseSection } from "./feed";

function section(id: string, code: string, professor: string, sectionCode: string, extra: Partial<CourseSection> = {}): CourseSection {
  return { id, section_code: sectionCode, courses: { code, title: `${code} title`, term: "Fall 2026" }, professors: { name: professor }, ...extra };
}

test("sections group by course and term, professors ordered within each course", () => {
  const groups = groupByCourse([
    section("b", "CSC 1001", "Kirk Alberto Duran", "S06"),
    section("a", "CSC 1001", "Anita Rathi", "S01"),
    section("c", "AERO 1121", "Kira Jorgensen Abercromby", "S01"),
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(group => group.code), ["CSC 1001", "AERO 1121"]);
  assert.deepEqual(groups[0].sections.map(entry => entry.professors.name), ["Anita Rathi", "Kirk Alberto Duran"]);
  assert.equal(groups[1].sections.length, 1);
});

test("the same course code in a different term stays a separate group", () => {
  const spring = section("s", "CSC 1001", "Anita Rathi", "S01");
  spring.courses = { code: "CSC 1001", title: "CSC 1001 title", term: "Spring 2027" };
  const groups = groupByCourse([section("f", "CSC 1001", "Anita Rathi", "S01"), spring]);
  assert.equal(groups.length, 2);
});

test("meeting label joins what is known and falls back when nothing is listed", () => {
  assert.equal(
    meetingLabel(section("a", "CSC 1001", "Anita Rathi", "S01", { days: "TR", start_time: "09:00 AM", end_time: "10:20 AM", location: "Science Room 0E11" })),
    "TR · 09:00 AM–10:20 AM · Science Room 0E11");
  assert.equal(meetingLabel(section("b", "BUS 3384A", "Rishi Singh", "V01", { days: "" })), "Meeting time not listed");
  // A half-known time is dropped rather than rendered as a dangling range.
  assert.equal(meetingLabel(section("c", "CSC 1001", "Anita Rathi", "S01", { days: "MWF", start_time: "12:00 PM" })), "MWF");
});

test('multiple sections collapse by actual course and professor IDs', () => {
  const entries = [
    section('s1', 'CSC 1001', 'Same Name', 'S01', {course_id:'c1',professor_id:'p1'}),
    section('s2', 'CSC 1001', 'Same Name', 'S02', {course_id:'c1',professor_id:'p1'}),
    section('s3', 'CSC 1001', 'Same Name', 'S03', {course_id:'c1',professor_id:'p2'}),
    section('s4', 'CSC 1001', 'Same Name', 'S04', {course_id:'c2',professor_id:'p1'}),
  ];
  const groups=groupByCourse(entries);
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].sections.map(s=>s.id),['s1','s3']);
  assert.deepEqual(groups[1].sections.map(s=>s.id),['s4']);
});
