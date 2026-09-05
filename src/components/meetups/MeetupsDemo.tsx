"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { addDemoMeetup, changeMeetup, type MeetupChange, type MeetupsData } from "@/lib/meetups-demo";
import type { MeetupDetails } from "@/lib/meetups-validation";
import MeetupDemoCard from "./MeetupDemoCard";
import MeetupCreateForm from "./MeetupCreateForm";

export default function MeetupsDemo({ initialData }: { initialData: MeetupsData }) {
  const [meetups, setMeetups] = useState(initialData.meetups);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "joined">("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const createButton = useRef<HTMLButtonElement>(null);
  const viewer = initialData.viewer;
  const visible = filter === "all" ? meetups : meetups.filter(meetup => meetup.participants.some(person => person.id === viewer.id));
  function handleChange(id: string, action: MeetupChange, now: number) {
    try {
      setMeetups(changeMeetup(meetups, id, viewer, action, now));
      setError("");
      setNotice(action.kind === "join" ? "Joined this sample meetup on this page only. Nothing was saved and nobody was notified." : action.kind === "leave" ? "Left this sample meetup on this page only. Nothing was saved and nobody was notified." : "Sample participant removed on this page only. Nothing was saved and nobody was notified.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update this sample meetup."); setNotice(""); }
  }
  function create(details: MeetupDetails) {
    try {
      setMeetups(addDemoMeetup(meetups, details, viewer, `demo-${crypto.randomUUID()}`));
      setCreating(false); setError(""); setNotice("Sample meetup added on this page only. Nothing was saved or published, and no invitations were sent.");
      createButton.current?.focus();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this sample meetup."); }
  }
  return <section className="space-y-6 text-stone-900" aria-labelledby="meetups-title">
    <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <p className="font-bold">Meetup preview · nothing is saved or shared</p>
      <p>The sample people, meetups and locations are fictional. You are trying this preview as {viewer.name}. Changes appear only on this page and disappear when you reload or leave. No invitations or notifications are sent.</p>
    </aside>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Example course · sample professor</p><h1 id="meetups-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Good company. Better studying.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Find a table, bring a question, work through it together. All times below are campus time.</p></div>
      <button ref={createButton} type="button" aria-expanded={creating} aria-controls="meetup-form" onClick={() => setCreating(!creating)} className="min-h-12 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">{creating ? "Close form" : "+ Create sample meetup"}</button>
    </header>
    <div id="meetup-form">{creating && <MeetupCreateForm onCreate={create} onCancel={() => { setCreating(false); createButton.current?.focus(); }} />}</div>
    <p role="status" className="text-sm text-emerald-900">{notice}</p>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" aria-label="Filter meetups">{(["all", "joined"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-emerald-900 bg-emerald-900 text-white" : "border-stone-300 bg-white"}`}>{value === "all" ? "All sample meetups" : "Joined by you"}</button>)}</div>
      <button type="button" onClick={() => { setMeetups([]); setError(""); setNotice("All meetups cleared from this preview, including any you added. Create a sample meetup or restore the original examples to start again."); }} className="min-h-11 text-sm text-stone-600 underline underline-offset-4">Clear preview meetups</button>
    </div>
    {visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map(meetup => <MeetupDemoCard key={meetup.id} meetup={meetup} viewer={viewer} onChange={action => handleChange(meetup.id, action, Date.now())} />)}</div> : <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center"><h2 className="text-xl font-semibold">{filter === "joined" ? "No joined sample meetups" : "A fresh table. Who’s joining?"}</h2><p className="mt-2 text-sm text-stone-600">{filter === "joined" ? "Choose All sample meetups to find one to join, or create a sample meetup above." : "Create a sample meetup above or restore the fictional examples."} Restoring samples replaces all your preview changes.</p><button type="button" onClick={() => { setMeetups(initialData.meetups); setFilter("all"); setError(""); setNotice("Original sample meetups restored. Your preview changes have been cleared."); }} className="mt-4 min-h-11 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold">Restore samples</button></div>}
    <footer className="border-t border-stone-200 pt-5 text-sm text-stone-600"><p>Meetups are location-and-time posts, with no separate meetup chats.</p><Link href="/preview/chat" prefetch={false} className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline underline-offset-4">Explore the chat demo →</Link></footer>
  </section>;
}
