"use client";
import { useActionState, useState, type ReactNode } from "react";
import { updateEnrollment } from "@/app/(app)/profile/enrollment-actions";
import type { CourseSection } from "@/lib/feed";

export default function EnrollmentForm({ sections, enrolled = [], search, compact = false, searchOpen = false }: { sections: CourseSection[]; enrolled?: CourseSection[]; search?: ReactNode; compact?: boolean; searchOpen?: boolean }) {
  const [state, action, pending] = useActionState(updateEnrollment, { ok: false, message: "" });
  const [leaving, setLeaving] = useState<string | null>(null);
  return <section className={compact ? "student-classes" : "workspace-panel profile-classes"} id="classes">
    <h2 className="workspace-section-title">{compact ? `My classes · ${enrolled.length}` : "Your classes and professors"}</h2>
    {!compact && <p className="workspace-hint">Choose your course sections. Sections with the same course and professor share meetups, chat, and files.</p>}
    {enrolled.length ? <ul className="enrollment-list">{enrolled.map(section => <li key={section.id}><div><strong>{section.courses.code}</strong>{compact && <p>{section.courses.title}</p>}<p>{section.professors.name}</p><p>{section.courses.term} · Section {section.section_code}</p></div>{leaving === section.id ? <form action={action} className="class-leave-confirm"><p>Leave {section.courses.code}, section {section.section_code}? You’ll lose access to this professor group unless you’re enrolled in another section with the same course and professor. Existing RSVPs aren’t cancelled.</p><input type="hidden" name="section_id" value={section.id} /><button name="intent" value="remove" disabled={pending} className="workspace-secondary">{pending ? "Leaving…" : "Confirm leave"}</button><button type="button" disabled={pending} className="workspace-secondary" onClick={() => setLeaving(null)}>Cancel</button></form> : <button type="button" disabled={pending} className="workspace-secondary" aria-label={`Leave ${section.courses.code} section ${section.section_code}`} onClick={() => setLeaving(section.id)}>Leave class</button>}</li>)}</ul> : <p className="workspace-notice">No classes added yet.</p>}
    <details className="student-add" open={searchOpen || undefined}><summary>+ Add a class</summary>
{search}
    {sections.length ? <form action={action} className="enrollment-add"><label className="workspace-field">Class and professor<select className="workspace-input" name="section_id" required defaultValue=""><option value="" disabled>Select a section</option>{sections.filter(section => !enrolled.some(item => item.id === section.id)).map(section => <option key={section.id} value={section.id}>{section.courses.code} · {section.courses.title} · {section.professors.name} · {section.courses.term} · Section {section.section_code}</option>)}</select></label><button className="workspace-button" name="intent" value="add" disabled={pending}>{pending ? "Updating…" : "Add class"}</button></form> : <p className="workspace-hint">No matching sections are available. Try another course code or check back when the course catalog is ready.</p>}
    </details>
    {!compact && <p className="workspace-hint">Removing a class ends access to its workspace. Cancel any existing RSVPs in Meetups first.</p>}
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </section>;
}
