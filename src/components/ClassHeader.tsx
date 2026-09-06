"use client";
import Link from "next/link";
import BrandMark from "./BrandMark";
import AddClassDialog from "./AddClassDialog";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { rememberClass } from "@/app/(app)/class-actions";
import { classFromPath, classHref, preferredClass, tabFromPath, CLASS_TABS, type ClassOption, type ClassTab } from "@/lib/class-navigation";

function TabLabel({ tab, label }: { tab: ClassTab; label: string }) {
  const paths: Record<ClassTab, string> = {
    meetups: "M4 4h16v6H4z M4 14h16v6H4z",
    chat: "M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 1 1 18-4Z",
    files: "M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z",
  };
  return <><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[tab]} /></svg><span>{label}</span></>;
}

export default function ClassHeader({ groups, selectedId, loadFailed = false, preview, onPreviewChange, previewCatalog, onPreviewAdd, onPreviewProfile }: { groups: ClassOption[]; selectedId?: string; loadFailed?: boolean; preview?: { groupId: string; tab: ClassTab; profile?: boolean }; onPreviewChange?: (group: string, tab: ClassTab) => void; previewCatalog?: ClassOption[]; onPreviewAdd?: (group: ClassOption) => void; onPreviewProfile?: () => void }) {
  const path = usePathname();
  const active = preview ? preferredClass(groups, preview.groupId) : classFromPath(groups, path);
  const selected = active || preferredClass(groups, selectedId);
  const tab = preview?.tab || tabFromPath(path);
  const panel = useRef<HTMLDetailsElement>(null);
  const [rememberError, setRememberError] = useState(false);
  const [adding, setAdding] = useState(false);
  const activeId = active?.id;
  const isPreview = !!preview;
  useEffect(() => {
    if (!activeId || isPreview) return;
    let cancelled = false;
    rememberClass(activeId).then(ok => { if (!cancelled) setRememberError(!ok); }).catch(() => { if (!cancelled) setRememberError(true); });
    return () => { cancelled = true; };
  }, [activeId, isPreview]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) panel.current.open = false; };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const inProfile = preview ? !!preview.profile : path === "/profile" || path === "/settings";
  return <>
    <a className="group-skip" href="#workspace-main">Skip to content</a>
    <header className="group-header">
      <Link href={preview ? "/preview/workspace" : "/spaces"} className="workspace-brand" aria-label="StudyCircle home"><BrandMark size={40} alt="" /><span className="group-wordmark">studycircle</span></Link>
      <details ref={panel} className="group-picker" onKeyDown={event => { if (event.key === "Escape" && panel.current) { panel.current.open = false; panel.current.querySelector("summary")?.focus(); } }}>
        <summary aria-label={selected ? `Choose class. Current: ${selected.code}, ${selected.professor}` : "Choose a class"}><span className="group-picker-label">{selected?.code || (loadFailed ? "Classes unavailable" : "Select your class")}<span>{selected?.professor || "Course and professor group"}</span></span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></summary>
        <div className="group-dropdown"><div className="group-dropdown-heading"><p className="group-dropdown-title">Your classes</p><button type="button" className="class-icon-button" aria-label="Add a class" title="Add a class" onClick={() => { if (panel.current) panel.current.open = false; setAdding(true); }}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></button></div><div className="group-options">{groups.length ? groups.map(group => {
          const content = <><span><strong>{group.code}</strong> {group.title}</span><small>{group.professor} · {group.term}</small>{selected?.id === group.id && <span className="group-selected-label">Selected</span>}</>;
          return preview ? <button key={group.id} className="group-option" onClick={() => { onPreviewChange?.(group.id, tab); if(panel.current) panel.current.open = false; }}>{content}</button> : <Link key={group.id} className="group-option" href={classHref(group, tab)} aria-current={selected?.id === group.id ? "true" : undefined} onClick={() => { if(panel.current) panel.current.open = false; }}>{content}</Link>;
        }) : <p className="group-dropdown-empty">{loadFailed ? "Your classes couldn’t be loaded. Refresh to try again." : "Choose your course sections in Profile to get started."}</p>}</div>{!preview && <Link href="/profile#classes" className="group-manage" onClick={() => { if(panel.current) panel.current.open = false; }}>Manage classes in Profile →</Link>}</div>
      </details>
      <Link href={preview ? "/preview/workspace?view=profile" : "/profile"} onClick={event => { if (preview && onPreviewProfile) { event.preventDefault(); onPreviewProfile(); } }} className="group-profile" aria-current={inProfile ? "page" : undefined}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></svg><span>Profile</span></Link>
    </header>
    {selected && !inProfile && <div className="group-subheader"><div className="group-course-meta"><span>{selected.title}</span><span>{selected.term}</span></div></div>}
    {selected && <nav className="group-tabs" aria-label="Class workspace">{CLASS_TABS.map(item => preview ? <button key={item.id} aria-current={!inProfile && item.id === tab ? "page" : undefined} onClick={() => onPreviewChange?.(selected.id, item.id)}><TabLabel tab={item.id} label={item.label} /></button> : <Link key={item.id} href={classHref(selected, item.id)} aria-current={active && item.id === tab ? "page" : undefined}><TabLabel tab={item.id} label={item.label} /></Link>)}</nav>}
    {rememberError && <p role="status" className="group-memory-error">This class is open, but your last-opened preference couldn’t be saved.</p>}
    {adding && <AddClassDialog previewCatalog={preview ? previewCatalog || groups : undefined} enrolledGroups={groups} onPreviewAdd={onPreviewAdd} onClose={() => { setAdding(false); panel.current?.querySelector("summary")?.focus(); }} />}
  </>;
}
