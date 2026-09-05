"use client";
import { useActionState } from "react";
import { updateEnrollment } from "@/app/(app)/profile/enrollment-actions";
import type { CourseSection } from "@/lib/feed";

export default function EnrollmentForm({ sections, enrolled = [] }: { sections: CourseSection[]; enrolled?: CourseSection[] }) {
  const [state, action, pending] = useActionState(updateEnrollment, { ok: false, message: "" });
  return <section className="workspace-panel profile-classes" id="classes">
    <h2 className="workspace-section-title">Your classes and professors</h2>
    <p className="workspace-hint">Add your class section to see meetups for its course and professor. Multiple sections with the same professor share one feed.</p>
    {enrolled.length ? <ul className="enrollment-list">{enrolled.map(section => <li key={section.id}><div><strong>{section.courses.code} · {section.professors.name}</strong><p>{section.courses.term} · Section {section.section_code}</p></div><form action={action}><input type="hidden" name="section_id" value={section.id} /><button name="intent" value="remove" disabled={pending} className="workspace-secondary" aria-label={`Remove ${section.courses.code} section ${section.section_code}`}>Remove</button></form></li>)}</ul> : <p className="workspace-notice">No classes added yet.</p>}
    {sections.length ? <form action={action} className="enrollment-add"><label className="workspace-field">Class and professor<select className="workspace-input" name="section_id" required defaultValue=""><option value="" disabled>Select a section</option>{sections.filter(section => !enrolled.some(item => item.id === section.id)).map(section => <option key={section.id} value={section.id}>{section.courses.code} · {section.courses.title} · {section.professors.name} · {section.courses.term} · Section {section.section_code}</option>)}</select></label><button className="workspace-button" name="intent" value="add" disabled={pending}>{pending ? "Updating…" : "Add class"}</button></form> : <p className="workspace-hint">No matching sections are available. Try another course code or check back when the course catalog is ready.</p>}
    <p className="workspace-hint">Removing a class hides its feed posts. It does not cancel existing RSVPs; cancel them in the feed first if needed.</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </section>;
}
