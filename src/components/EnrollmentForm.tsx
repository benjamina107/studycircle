"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchClassSections } from "@/app/(app)/catalog-actions";
import { updateEnrollment } from "@/app/(app)/profile/enrollment-actions";
import { groupByCourse, classPairKey, type CourseGroup } from "@/lib/class-catalog";
import type { CourseSection } from "@/lib/feed";

export default function EnrollmentForm({ enrolled: enrolledSections = [], compact = false }: { enrolled?: CourseSection[]; compact?: boolean }) {
  const enrolled = groupByCourse(enrolledSections).flatMap(group => group.sections);
  const [state, action, pending] = useActionState(updateEnrollment, { ok: false, message: "" });
  const [leaving, setLeaving] = useState<string | null>(null);
  const addDialog = useRef<HTMLDialogElement>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const leavingClass = enrolled.find(section => section.id === leaving);
  useEffect(() => {
    if (state.ok && !pending) leaveDialog.current?.close();
  }, [state, pending]);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page,setPage]=useState(0);
  const [total,setTotal]=useState(0);
  const [pageSize,setPageSize]=useState(8);
  const resultsRef=useRef<HTMLUListElement>(null);
  const [adding, setAdding] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const request = useRef(0);
  const router = useRouter();
  const listId = useId();

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  function changeQuery(value: string) {
    request.current++; setPage(0); setGroups([]); setMessage("");
    setQuery(value);
    if (value.trim()) { setSearching(true); return; }
    request.current++;
    setGroups([]); setSearched(false); setSearching(false); setMessage(""); setTotal(0);
  }

  useEffect(() => {
    const text = query.trim();
    if (!text) return;
    // Debounce keystrokes, and ignore any response that a newer search has superseded.
    const ticket = ++request.current;
    const timer = setTimeout(async () => {
      try {
        const result = await searchClassSections(text, "", page);
        if (!alive.current || ticket !== request.current) return;
        setGroups(groupByCourse(result.sections));
        setEnrolledIds(result.enrolledIds);
        setTotal(result.total); setPageSize(result.pageSize);
        if(resultsRef.current)resultsRef.current.scrollTop=0;
        setMessage(result.message || "");
      } catch {
        if (alive.current && ticket === request.current) { setGroups([]); setMessage("Classes couldn’t be loaded. Please try again."); }
      } finally {
        if (alive.current && ticket === request.current) { setSearching(false); setSearched(true); }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query,page]);

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
    <div className="student-classes-heading"><h2 className="workspace-section-title">{compact ? `My classes · ${enrolled.length}` : "Your classes and professors"}</h2><button type="button" className="student-add-button" onClick={()=>addDialog.current?.showModal()}><span aria-hidden="true">+</span> Add class</button></div>
    {!compact && <p className="workspace-hint">Sections with the same course and professor share meetups, chat, and files.</p>}
    {enrolled.length ? <ul className="enrollment-list">{enrolled.map(section => <li key={section.id}><div><strong>{section.courses.code}</strong><p>{section.courses.title}</p><p>{section.professors.name}</p><p>{section.courses.term}</p></div><button type="button" disabled={pending} className="workspace-secondary" aria-label={`Leave ${section.courses.code} with ${section.professors.name}`} onClick={() => {setLeaving(section.id);leaveDialog.current?.showModal();}}>Leave class</button></li>)}</ul> : <p className="workspace-notice">No classes added yet.</p>}


    <dialog ref={addDialog} className="add-class-dialog" aria-labelledby="add-class-title"><div className="enrollment-add">
      <header className="add-class-heading"><div><h2 id="add-class-title">Find your class</h2><p>Choose a course, then your professor.</p></div><button type="button" aria-label="Close add class" onClick={()=>addDialog.current?.close()}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
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
        <p className="workspace-hint">Start typing to narrow the catalog, then pick your professor.</p>
      </div>

      <p role="status" className="workspace-hint catalog-status">
        {searching ? "Searching…" : !query.trim() ? "" : !searched ? "" : message ? "" : groups.length ? `${page*pageSize+1}–${Math.min((page+1)*pageSize,total)} of ${total} matching courses` : "No matching courses. Check the code, or try the course title."}
      </p>
      {message && <p role="alert" className="workspace-notice">{message}</p>}

      {groups.length > 0 && <ul ref={resultsRef} className="catalog-results">
        {groups.map(group => <li key={group.key} className="catalog-course">
          <div className="catalog-course-heading">
            <strong>{group.code}</strong>
            <span>{group.title}</span>
            <small>{group.term}</small>
          </div>
          <ul className="catalog-sections">
            {group.sections.map(section => {
              const already = enrolledIds.includes(section.id) || enrolled.some(item => classPairKey(item) === classPairKey(section));
              return <li key={section.id}>
                <div className="catalog-section-detail">
                  <strong>{section.professors.name}</strong>
                  <small>{group.term}</small>
                </div>
                <button type="button" className={already ? "workspace-secondary" : "workspace-button"} disabled={already || adding === section.id || !!adding}
                  aria-label={already ? `Already enrolled in ${group.code} with ${section.professors.name}` : `Add ${group.code} with ${section.professors.name}`}
                  onClick={() => void add(section)}>
                  {already ? "Added" : adding === section.id ? "Adding…" : "Add"}
                </button>
              </li>;
            })}
          </ul>
        </li>)}
      </ul>}
      {total>pageSize&&<nav className="catalog-pagination" aria-label="Course search pages"><button type="button" className="workspace-secondary" disabled={page===0||searching} onClick={()=>{setSearching(true);setPage(p=>p-1);}}>Previous</button><span>Page {page+1} of {Math.ceil(total/pageSize)}</span><button type="button" className="workspace-secondary" disabled={(page+1)*pageSize>=total||searching} onClick={()=>{setSearching(true);setPage(p=>p+1);}}>Next</button></nav>}
    </div>

    </dialog>
    {!compact && <p className="workspace-hint">Removing a class ends access to its workspace. Cancel any existing RSVPs in Meetups first.</p>}
    <dialog ref={leaveDialog} className="leave-class-dialog" aria-labelledby="leave-class-title" onClose={()=>setLeaving(null)}>
      <h2 id="leave-class-title">Leave this class?</h2>
      <p>{leavingClass?.courses.code} · {leavingClass?.professors.name}</p>
      <p>You’ll lose access to this class’s chat and files. Existing meetup RSVPs won’t be cancelled.</p>
      <form action={action}>
        <input type="hidden" name="section_id" value={leaving || ''}/>
        <div className="leave-class-actions"><button type="button" autoFocus disabled={pending} className="workspace-secondary" onClick={()=>leaveDialog.current?.close()}>Cancel</button><button name="intent" value="remove" disabled={pending} className="workspace-button">{pending?'Leaving…':'Leave class'}</button></div>
        {!state.ok && state.message && <p role="alert">{state.message}</p>}
      </form>
    </dialog>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </section>;
}
