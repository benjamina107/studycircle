"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchClassSections } from "@/app/(app)/catalog-actions";
import { updateEnrollment } from "@/app/(app)/profile/enrollment-actions";
import { groupByCourse, meetingLabel, type CourseGroup } from "@/lib/class-catalog";
import type { CourseSection } from "@/lib/feed";

export default function EnrollmentForm({ enrolled = [], compact = false }: { enrolled?: CourseSection[]; compact?: boolean }) {
  const [state, action, pending] = useActionState(updateEnrollment, { ok: false, message: "" });
  const [leaving, setLeaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [capped, setCapped] = useState(false);
  const [adding, setAdding] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const request = useRef(0);
  const router = useRouter();
  const listId = useId();

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  function changeQuery(value: string) {
    setQuery(value);
    if (value.trim()) { setSearching(true); return; }
    request.current++;
    setGroups([]); setSearched(false); setSearching(false); setMessage(""); setCapped(false);
  }

  useEffect(() => {
    const text = query.trim();
    if (!text) return;
    // Debounce keystrokes, and ignore any response that a newer search has superseded.
    const ticket = ++request.current;
    const timer = setTimeout(async () => {
      try {
        const result = await searchClassSections(text, "");
        if (!alive.current || ticket !== request.current) return;
        setGroups(groupByCourse(result.sections));
        setEnrolledIds(result.enrolledIds);
        setCapped(result.sections.length === 30);
        setMessage(result.message || "");
      } catch {
        if (alive.current && ticket === request.current) { setGroups([]); setMessage("Classes couldn’t be loaded. Please try again."); }
      } finally {
        if (alive.current && ticket === request.current) { setSearching(false); setSearched(true); }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function add(section: CourseSection) {
    if (adding) return;
    setAdding(section.id); setMessage("");
    try {
      const form = new FormData();
      form.set("section_id", section.id);
      form.set("intent", "add");
      const result = await updateEnrollment({ ok: false, message: "" }, form);
      if (!alive.current) return;
      if (!result.ok) { setMessage(result.message); return; }
      setEnrolledIds(current => [...current, section.id]);
      setMessage(`${section.courses.code} with ${section.professors.name} added.`);
      router.refresh();
    } catch {
      if (alive.current) setMessage("We couldn’t confirm the change. Check your classes before trying again.");
    } finally { if (alive.current) setAdding(""); }
  }

  return <section className={compact ? "student-classes" : "workspace-panel profile-classes"} id="classes">
    <h2 className="workspace-section-title">{compact ? `My classes · ${enrolled.length}` : "Your classes and professors"}</h2>
    {!compact && <p className="workspace-hint">Sections with the same course and professor share meetups, chat, and files.</p>}
    {enrolled.length ? <ul className="enrollment-list">{enrolled.map(section => <li key={section.id}><div><strong>{section.courses.code}</strong><p>{section.courses.title}</p><p>{section.professors.name}</p><p>{section.courses.term} · Section {section.section_code}</p></div>{leaving === section.id ? <form action={action} className="class-leave-confirm"><p>Leave {section.courses.code}, section {section.section_code}? You’ll lose access to this professor group unless you’re enrolled in another section with the same course and professor. Existing RSVPs aren’t cancelled.</p><input type="hidden" name="section_id" value={section.id} /><button name="intent" value="remove" disabled={pending} className="workspace-secondary">{pending ? "Leaving…" : "Confirm leave"}</button><button type="button" disabled={pending} className="workspace-secondary" onClick={() => setLeaving(null)}>Cancel</button></form> : <button type="button" disabled={pending} className="workspace-secondary" aria-label={`Leave ${section.courses.code} section ${section.section_code}`} onClick={() => setLeaving(section.id)}>Leave class</button>}</li>)}</ul> : <p className="workspace-notice">No classes added yet.</p>}

    <details className="student-add"><summary>+ Add a class</summary><div className="enrollment-add">
      <h3 className="workspace-section-title">Add a class</h3>
      <div className="catalog-search">
        <label className="workspace-field" htmlFor={listId}>Find your course
          <span className="catalog-search-box">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
            <input id={listId} className="workspace-input" type="search" autoComplete="off" maxLength={60}
              placeholder="Course code or title, e.g. CSC 1001" value={query}
              onChange={event => changeQuery(event.target.value)} />
            {query && <button type="button" className="catalog-search-clear" aria-label="Clear search" onClick={() => changeQuery("")}>×</button>}
          </span>
        </label>
        <p className="workspace-hint">Start typing to narrow the catalog, then pick your professor’s section.</p>
      </div>

      <p role="status" className="workspace-hint catalog-status">
        {searching ? "Searching…" : !query.trim() ? "" : !searched ? "" : message ? "" : groups.length ? `${groups.length} matching ${groups.length === 1 ? "course" : "courses"}${capped ? " · keep typing to narrow further" : ""}` : "No matching courses. Check the code, or try the course title."}
      </p>
      {message && <p role="alert" className="workspace-notice">{message}</p>}

      {groups.length > 0 && <ul className="catalog-results">
        {groups.map(group => <li key={group.key} className="catalog-course">
          <div className="catalog-course-heading">
            <strong>{group.code}</strong>
            <span>{group.title}</span>
            <small>{group.term}</small>
          </div>
          <ul className="catalog-sections">
            {group.sections.map(section => {
              const already = enrolledIds.includes(section.id) || enrolled.some(item => item.id === section.id);
              return <li key={section.id}>
                <div className="catalog-section-detail">
                  <strong>{section.professors.name}</strong>
                  <small>Section {section.section_code} · {meetingLabel(section)}</small>
                </div>
                <button type="button" className={already ? "workspace-secondary" : "workspace-button"} disabled={already || adding === section.id || !!adding}
                  aria-label={already ? `Already enrolled in ${group.code} with ${section.professors.name}` : `Add ${group.code} with ${section.professors.name}, section ${section.section_code}`}
                  onClick={() => void add(section)}>
                  {already ? "Added" : adding === section.id ? "Adding…" : "Add"}
                </button>
              </li>;
            })}
          </ul>
        </li>)}
      </ul>}
    </div>

    </details>
    {!compact && <p className="workspace-hint">Removing a class ends access to its workspace. Cancel any existing RSVPs in Meetups first.</p>}
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </section>;
}
