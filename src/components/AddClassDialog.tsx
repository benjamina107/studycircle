"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { searchClassSections } from "@/app/(app)/catalog-actions";
import { updateEnrollment } from "@/app/(app)/profile/enrollment-actions";
import type { CourseSection } from "@/lib/feed";
import type { ClassOption } from "@/lib/class-navigation";

export default function AddClassDialog({ onClose, previewCatalog, enrolledGroups = [], onPreviewAdd }: {
  onClose: () => void; previewCatalog?: ClassOption[]; enrolledGroups?: ClassOption[]; onPreviewAdd?: (group: ClassOption) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const router = useRouter();
  const [course, setCourse] = useState("");
  const [professor, setProfessor] = useState("");
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    alive.current = true;
    const element = dialog.current;
    element?.showModal();
    input.current?.focus();
    return () => { alive.current = false; element?.close(); };
  }, []);
  async function search(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage(""); setSearched(false); setSections([]);
    try {
      if (previewCatalog) {
        const matches = previewCatalog.filter(group =>
          `${group.code} ${group.title}`.toLowerCase().includes(course.trim().toLowerCase()) &&
          group.professor.toLowerCase().includes(professor.trim().toLowerCase()));
        setSections(matches.map(group => ({ id: group.id, section_code: "01", courses: { code: group.code, title: group.title, term: group.term }, professors: { name: group.professor } })));
        setEnrolledIds(enrolledGroups.map(group => group.id));
      } else {
        const result = await searchClassSections(course, professor);
        if (!alive.current) return;
        setSections(result.sections); setEnrolledIds(result.enrolledIds); setMessage(result.message || "");
      }
      setSearched(true);
    } catch { if (alive.current) setMessage("Classes couldn’t be loaded. Please try again."); }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  async function add(section: CourseSection) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("");
    try {
      if (previewCatalog) {
        const group = previewCatalog.find(group => group.id === section.id);
        if (group) onPreviewAdd?.(group);
      } else {
        const form = new FormData(); form.set("section_id", section.id); form.set("intent", "add");
        const result = await updateEnrollment({ ok: false, message: "" }, form);
        if (!alive.current) return;
        if (!result.ok) { setMessage(result.message); return; }
        router.refresh();
      }
      onClose();
    } catch { if (alive.current) setMessage("We couldn’t confirm the change. Check your classes before trying again."); }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  return <dialog ref={dialog} className="class-dialog" aria-labelledby="add-class-title" onCancel={event => { event.preventDefault(); if (!busyRef.current) onClose(); }}>
    <header className="class-dialog-heading"><h2 id="add-class-title">Add a class</h2><button type="button" className="class-icon-button" aria-label="Close add class" disabled={busy} onClick={onClose}>×</button></header>
    <p className="workspace-hint">Find your course and professor, then choose your section.</p>
    {previewCatalog && <p className="workspace-hint">Sample catalog · changes stay in this preview.</p>}
    <form onSubmit={search} className="class-search-form">
      <label className="workspace-field">Course<input ref={input} className="workspace-input" placeholder="e.g. CSC 202 or Data Structures" maxLength={60} value={course} onChange={event => setCourse(event.target.value)} disabled={busy} /></label>
      <label className="workspace-field">Professor<input className="workspace-input" placeholder="Professor’s name" maxLength={60} value={professor} onChange={event => setProfessor(event.target.value)} disabled={busy} /></label>
      <button className="workspace-button" disabled={busy || (!course.trim() && !professor.trim())}>{busy ? "Working…" : "Search"}</button>
    </form>
    {message && <p role="alert" className="workspace-notice">{message}</p>}
    {searched && !message && <p role="status" className="workspace-hint">{sections.length ? `${sections.length} matching sections${sections.length === 30 ? " · Narrow your search for more specific results." : ""}` : "No matching sections. Try another search, or check back when the catalog is updated."}</p>}
    <ul className="class-search-results">{sections.map(section => <li key={section.id}><div><strong>{section.courses.code} · {section.professors.name}</strong><p>{section.courses.title}</p><small>{section.courses.term} · Section {section.section_code}</small></div><button className="workspace-secondary" disabled={busy || enrolledIds.includes(section.id)} onClick={() => void add(section)} aria-label={enrolledIds.includes(section.id) ? `Already added ${section.courses.code} ${section.professors.name}` : `Add ${section.courses.code} ${section.professors.name} section ${section.section_code}`}>{enrolledIds.includes(section.id) ? "Added" : "Add"}</button></li>)}</ul>
  </dialog>;
}
