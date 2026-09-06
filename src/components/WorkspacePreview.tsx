"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import ClassHeader from "./ClassHeader";
import type { ClassOption, ClassTab } from "@/lib/class-navigation";
import { MEETUP_LIMITS, resolveCampusTime } from "@/lib/meetups-validation";
import { meetupTime } from "@/lib/feed";
import meetupStyles from "@/features/class-meetups/class-meetups.module.css";
import chatStyles from "@/features/class-chat/ClassChat.module.css";
import fileStyles from "@/features/files/ClassFiles.module.css";
import styles from "./WorkspacePreview.module.css";

const previewCatalog: ClassOption[] = [
  { id: "cs", spaceId: "computing", code: "CSC 202", title: "Data Structures", professor: "Professor Lumen", term: "Fall 2026" },
  { id: "math", spaceId: "mathematics", code: "MATH 206", title: "Linear Algebra", professor: "Professor Rowan", term: "Fall 2026" },
  { id: "cs-other", spaceId: "computing", code: "CSC 202", title: "Data Structures", professor: "Professor Chen", term: "Fall 2026" },
];
type Channel = "general" | "homework";
type SampleMeetup = { id: string; title: string; blurb: string; location: string; startsAt: string; joined: boolean; hosting?: boolean };
type SampleMessage = { id: string; author: string; text: string; attachment?: string };
const resources: Record<string, string[]> = {
  cs: ["Trees and graphs notes.pdf", "Practice problems.pdf"],
  math: ["Vector spaces notes.pdf", "Matrix exercises.pdf"],
  "cs-other": ["Sorting review.pdf", "Recursion worksheet.pdf"],
};

export default function WorkspacePreview({ initialTab = "meetups", initialGroup = "cs", initialChannel = "general", initialProfile = false }: {
  initialTab?: ClassTab; initialGroup?: string; initialChannel?: Channel; initialProfile?: boolean;
}) {
  const [groupId, setGroupId] = useState(initialGroup);
  const [tab, setTab] = useState<ClassTab>(initialTab);
  const [profile, setProfile] = useState(initialProfile);
  const [groups, setGroups] = useState(previewCatalog.slice(0, 2));
  const [leaveId, setLeaveId] = useState<string | null>(null);
  return <div className={`workspace ${styles.preview}`}>
    <ClassHeader groups={groups} preview={{ groupId, tab, profile }} previewCatalog={previewCatalog} onPreviewProfile={() => setProfile(true)} onPreviewAdd={group => { setGroups(current => current.some(item => item.id === group.id) ? current : [...current, group]); setGroupId(group.id); setProfile(false); }} onPreviewChange={(group, nextTab) => { setGroupId(group); setTab(nextTab); setProfile(false); }} />
    <div className={styles.notice}>Layout preview · sample data</div>
    <main id="workspace-main" tabIndex={-1} className="group-content">
      {profile && <section className={styles.profile} aria-label="Sample profile">
        <header className="page-heading"><h1>Profile</h1><p>Your details and classes.</p></header>
        <div className="workspace-panel profile-form"><div className="profile-identity"><span className="profile-avatar" aria-hidden="true">JS</span><div><strong>Jordan Santos</strong><p>Computer Science · Sample student</p></div></div>
          <p className="workspace-hint">Personal details are read-only here. Class changes reset when you reload.</p>
          <h2 className="workspace-section-title">Your classes</h2><ul className="enrollment-list">{groups.map(group => <li key={group.id}><div><strong>{group.code} · {group.title}</strong><p>{group.professor} · {group.term}</p></div>{leaveId === group.id ? <div className="class-leave-confirm"><p>Leave {group.code} with {group.professor}? You’ll lose access to its meetups, chat, and files.</p><button className="workspace-secondary" onClick={() => { const remaining = groups.filter(item => item.id !== group.id); setGroups(remaining); if (groupId === group.id) setGroupId(remaining[0]?.id || ""); setLeaveId(null); }}>Confirm leave</button><button className="workspace-secondary" onClick={() => setLeaveId(null)}>Cancel</button></div> : <button className="workspace-secondary" onClick={() => setLeaveId(group.id)} aria-label={`Leave ${group.code} with ${group.professor}`}>Leave class</button>}</li>)}</ul>
          {!groups.length && <p className="workspace-hint">No classes yet. Use + in the class dropdown to add one.</p>}
        </div>
      </section>}
      {groups.map(group => <div key={group.id} hidden={profile || groupId !== group.id} className={styles.pane}>
        <div hidden={tab !== "meetups"} className={styles.pane}><PreviewMeetups group={group} /></div>
        <div hidden={tab !== "chat"} className={styles.pane}><PreviewChat group={group} initialChannel={initialChannel} /></div>
        <div hidden={tab !== "files"} className={styles.pane}><PreviewFiles group={group} /></div>
      </div>)}
    </main>
  </div>;
}

function PreviewMeetups({ group }: { group: ClassOption }) {
  const [meetups, setMeetups] = useState<SampleMeetup[]>([
    { id: `${group.id}-1`, title: group.id === "math" ? "Work through vector spaces" : group.id === "cs-other" ? "Recursion practice" : "Trees and graphs study session", blurb: "Bring a practice problem. We’ll work through a few together.", location: "Library · second floor", startsAt: "2030-09-18T22:00:00Z", joined: false },
    { id: `${group.id}-2`, title: "Review this week’s homework", blurb: "Compare approaches and talk through the tricky parts.", location: "University Union · study lounge", startsAt: "2030-09-19T20:00:00Z", joined: true },
  ]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  return <section className={meetupStyles.screen} aria-label={`${group.code} meetups`}>
    <header className={meetupStyles.header}><h1>Meetups</h1><p>Study together with this class and professor.</p></header>
    <button ref={trigger} className={meetupStyles.primary} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Create meetup</button>
    <div id={id}>{open && <PreviewMeetupForm onCancel={() => { setOpen(false); trigger.current?.focus(); }} onCreate={meetup => {
      setMeetups(current => [...current, meetup].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setOpen(false); setNotice("Meetup added to this preview."); trigger.current?.focus();
    }} />}</div>
    <p role="status" className={meetupStyles.hint}>{notice}</p>
    <h2>Upcoming meetups</h2><p className={meetupStyles.hint}>Campus time · Pacific · Changes reset when you reload.</p>
    <ul className={meetupStyles.feed}>{meetups.map(meetup => <li key={meetup.id}><article className={meetupStyles.card}>
      <h3>{meetup.title}</h3><time dateTime={meetup.startsAt}>{meetupTime(meetup.startsAt)}</time><p className={meetupStyles.location}>{meetup.location}</p><p className={meetupStyles.blurb}>{meetup.blurb}</p>
      {meetup.hosting ? <span className={meetupStyles.badge}>You’re hosting · Going</span> : <div className={meetupStyles.rsvp}><button className={meetup.joined ? meetupStyles.secondary : meetupStyles.primary} onClick={() => {
        setMeetups(current => current.map(item => item.id === meetup.id ? { ...item, joined: !item.joined } : item));
        setNotice(meetup.joined ? "RSVP cancelled in this preview." : "You’re going in this preview.");
      }}>{meetup.joined ? "Cancel RSVP" : "RSVP"}</button>{meetup.joined && <span className={meetupStyles.badge}>Going</span>}</div>}
    </article></li>)}</ul>
  </section>;
}

function PreviewMeetupForm({ onCreate, onCancel }: { onCreate: (meetup: SampleMeetup) => void; onCancel: () => void }) {
  const id = useId();
  const title = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ title: "", blurb: "", location: "", date: "", time: "" });
  useEffect(() => { title.current?.focus(); }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const matches = resolveCampusTime(draft.date, draft.time);
    if (!draft.title.trim() || !draft.location.trim()) { setError("Enter a title and location."); return; }
    if (matches.length !== 1 || matches[0] <= Date.now()) { setError("Choose a future campus time outside the clock-change gap or repeated hour."); return; }
    onCreate({ ...draft, title: draft.title.trim(), location: draft.location.trim(), id: crypto.randomUUID(), startsAt: new Date(matches[0]).toISOString(), joined: true, hosting: true });
  }
  return <form className={meetupStyles.form} onSubmit={submit} aria-label="Create sample meetup">
    <h2>Plan a class meetup</h2><p id={`${id}-zone`} className={meetupStyles.hint}>Dates and times are in Pacific time.</p>
    <div className={meetupStyles.fields}>{(["title", "blurb", "location", "date", "time"] as const).map(key => <div key={key} className={meetupStyles.field}>
      <label htmlFor={`${id}-${key}`}>{key === "blurb" ? "Description (optional)" : key.charAt(0).toUpperCase() + key.slice(1)}</label>
      {key === "blurb" ? <textarea id={`${id}-${key}`} value={draft[key]} rows={3} maxLength={MEETUP_LIMITS.blurb} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
        : <input id={`${id}-${key}`} ref={key === "title" ? title : undefined} type={key === "date" || key === "time" ? key : "text"} required value={draft[key]}
          maxLength={key === "title" || key === "location" ? MEETUP_LIMITS[key] : undefined} aria-describedby={key === "date" || key === "time" ? `${id}-zone` : undefined}
          onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}
    </div>)}<div className={meetupStyles.buttons}><button className={meetupStyles.primary}>Post meetup</button><button type="button" className={meetupStyles.secondary} onClick={onCancel}>Cancel</button></div></div>
    {error && <p role="alert" className={meetupStyles.error}>{error}</p>}
  </form>;
}

function PreviewChat({ group, initialChannel }: { group: ClassOption; initialChannel: Channel }) {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [messages, setMessages] = useState<Record<Channel, SampleMessage[]>>({
    general: [{ id: "hello", author: "Maya", text: `Anyone in ${group.professor}’s class want to compare notes after lecture?` }, { id: "reply", author: "Alex", text: "Yes! I put my notes here if they help.", attachment: resources[group.id][0] }],
    homework: [{ id: "question", author: "Sam", text: group.id === "math" ? "How did you check whether those vectors are independent?" : "Can someone explain how to trace the recursive calls?" }, { id: "answer", author: "Maya", text: "I wrote out each step. Here’s the practice sheet.", attachment: resources[group.id][1] }],
  });
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages, channel]);
  return <section className={chatStyles.chat} aria-label={`${group.code} class chat`}>
    <header className={chatStyles.header}><div><h1>Chat</h1><p>General discussion and homework questions.</p></div><nav className={chatStyles.channels} aria-label="Chat channels">{(["general", "homework"] as const).map(name => <button key={name} aria-pressed={name === channel} onClick={() => setChannel(name)}>{name === "general" ? "General" : "Homework"}</button>)}</nav></header>
    <ol ref={list} className={chatStyles.messages} aria-label={`${channel} messages`}>{messages[channel].map(message => <li key={message.id} className={chatStyles.message}>
      <span className={chatStyles.avatar} aria-hidden="true">{message.author.slice(0, 1)}</span><div className={chatStyles.messageContent}><div className={chatStyles.byline}><strong>{message.author}</strong></div><p>{message.text}</p>{message.attachment && <div className={chatStyles.attachment}>{message.attachment}<span>Sample attachment</span></div>}</div>
    </li>)}</ol>
    <PreviewComposer key={channel} channel={channel} resources={resources[group.id]} onSend={message => setMessages(current => ({ ...current, [channel]: [...current[channel], message] }))} />
  </section>;
}

function PreviewComposer({ channel, resources: files, onSend }: { channel: Channel; resources: string[]; onSend: (message: SampleMessage) => void }) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [picker, setPicker] = useState(false);
  const [notice, setNotice] = useState("");
  const id = useId();
  return <form className={chatStyles.composer} onSubmit={event => {
    event.preventDefault(); if (!body.trim() && !attachment) return;
    onSend({ id: crypto.randomUUID(), author: "You", text: body.trim(), attachment: attachment || undefined });
    setBody(""); setAttachment(""); setPicker(false); setNotice("Message added to this preview.");
  }}>
    <label htmlFor={id}>Message {channel === "general" ? "General" : "Homework"}</label><textarea id={id} value={body} maxLength={4000} onChange={event => setBody(event.target.value)} placeholder="Write a message…" />
    <div className={chatStyles.actions}><button type="button" aria-expanded={picker} aria-controls={`${id}-files`} onClick={() => setPicker(!picker)}>Attach class file</button><button type="button" disabled title="Uploads are unavailable in this preview">Upload file</button><button className={chatStyles.send} disabled={!body.trim() && !attachment}>Send</button></div>
    <div id={`${id}-files`}>{picker && <div className={chatStyles.picker}><p>Choose a sample attachment</p><ul>{files.map(file => <li key={file}><button type="button" onClick={() => { setAttachment(file); setPicker(false); }}>{file}</button></li>)}</ul></div>}</div>
    {attachment && <div className={chatStyles.selected}><span>{attachment} · sample attachment</span><button type="button" onClick={() => setAttachment("")}>Remove</button></div>}
    <p className={chatStyles.hint}>Messages stay in this preview. Uploads and downloads are unavailable.</p><p role="status" className={chatStyles.hint}>{notice}</p>
  </form>;
}

function PreviewFiles({ group }: { group: ClassOption }) {
  return <section className={fileStyles.panel} aria-label={`${group.code} class files`}>
    <header className={fileStyles.heading}><div><h1>Files</h1><p>Notes and resources, shared with this class.</p></div></header>
    <div className={fileStyles.upload}><strong>Share a file</strong><p>Uploads and downloads are unavailable in this preview.</p><div className={fileStyles.controls}><button disabled>Choose file</button><button disabled>Upload file</button></div></div>
    <ul className={fileStyles.list}>{resources[group.id].map((name, index) => <li key={name}><div className={fileStyles.file}><span className={fileStyles.name}>{name}</span><span className={fileStyles.meta}>PDF · {index ? "86 KB" : "240 KB"} · Sample file</span></div><button disabled className={fileStyles.secondary} aria-label={`Download ${name} unavailable in preview`}>Download ↓</button></li>)}</ul>
  </section>;
}
