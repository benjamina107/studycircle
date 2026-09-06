import type { CourseSection } from "./feed";

export type CourseGroup = { key: string; code: string; title: string; term: string; sections: CourseSection[] };

// Search returns flat sections; students pick a course first, then the professor teaching it.
export function groupByCourse(sections: CourseSection[]): CourseGroup[] {
  const groups = new Map<string, CourseGroup>();
  for (const section of sections) {
    const key = `${section.courses.code}·${section.courses.term}`;
    const group = groups.get(key) ?? { key, code: section.courses.code, title: section.courses.title, term: section.courses.term, sections: [] };
    group.sections.push(section);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.sections.sort((first, second) => first.professors.name.localeCompare(second.professors.name) || first.section_code.localeCompare(second.section_code));
  }
  return [...groups.values()];
}

export function meetingLabel(section: CourseSection): string {
  const time = section.start_time && section.end_time ? `${section.start_time}–${section.end_time}` : "";
  return [section.days || "", time, section.location || ""].filter(Boolean).join(" · ") || "Meeting time not listed";
}
