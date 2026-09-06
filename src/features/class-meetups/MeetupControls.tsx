"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MEETUP_LIMITS } from "@/lib/meetups-validation";
import { classMeetupRsvp, createClassMeetup } from "./actions";
import { emptyDraft, type Draft, type Result } from "./validation";
import styles from "./class-meetups.module.css";

const initial: Result = { ok: false, message: "" };

export function CreateMeetup({ spaceId, subspaceId }: { spaceId: string; subspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  const restoreFocus = useRef(false);
  const id = useId();
  useEffect(() => {
    if (!open && !busy && restoreFocus.current) {
      button.current?.focus();
      restoreFocus.current = false;
    }
  }, [open, busy]);
  function close(success = "") {
    restoreFocus.current = true;
    setOpen(false);
    setMessage(success);
  }
  return <div className={styles.createControl}>
    <button ref={button} type="button" className={styles.primary} disabled={busy} aria-haspopup="dialog" aria-controls={id}
      onClick={() => { setOpen(true); setMessage(""); }}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> Create meetup</button>
    <dialog ref={dialog} id={id} className={styles.dialog} aria-label="Create a meetup" onCancel={event=>{event.preventDefault();if(!busy)close();}} onClose={()=>{if(!busy)setOpen(false);}}>
      <button type="button" className={styles.close} disabled={busy} aria-label="Close create meetup" onClick={()=>close()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      {open && <CreationForm spaceId={spaceId} subspaceId={subspaceId} onClose={close} onPending={setBusy} />}
    </dialog>
    {message&&<p role="status" className={styles.creationStatus}>{message}</p>}
  </div>;
}

function CreationForm({ spaceId, subspaceId, onClose, onPending }: { spaceId: string; subspaceId: string; onClose: (message?: string) => void; onPending: (pending: boolean) => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const router = useRouter();
  const id = useId();
  const title = useRef<HTMLInputElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [state, action, pending] = useActionState(async (previous: Result, form: FormData) => {
    onPending(true);
    try {
      const result = await createClassMeetup(spaceId, subspaceId, previous, form);
      if (result.ok) { onClose(result.message); router.refresh(); }
      return result;
    } catch {
      return { ok: false, message: "We couldn’t confirm the result. Refresh Meetups before trying again; your meetup may have been saved." };
    } finally {
      onPending(false);
    }
  }, initial);
  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => { if (!state.ok && state.message) errorSummary.current?.focus(); }, [state]);
  const labels: Record<keyof Draft, string> = { title: "Title", blurb: "A little more detail (optional)", location: "Location", date: "Date", time: "Time" };
  return <form action={action} className={styles.form} aria-labelledby={`${id}-heading`} aria-busy={pending}>
    <h2 id={`${id}-heading`}>Plan a study session</h2>
    <p id={`${id}-zone`} className={styles.hint}>Pick a place and a time. Your class can join from here.</p>
    <fieldset disabled={pending} className={styles.fields}>
      {(Object.keys(labels) as (keyof Draft)[]).map(key => {
        const props = {
          id: `${id}-${key}`, name: key, value: draft[key], required: key !== "blurb",
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [key]: event.target.value })),
          "aria-invalid": !!state.errors?.[key],
          "aria-describedby": `${key === "date" || key === "time" ? `${id}-zone ` : ""}${state.errors?.[key] ? `${id}-${key}-error` : ""}`.trim() || undefined,
        };
        return <div key={key} className={styles.field} data-field={key}>
          <label htmlFor={props.id}>{labels[key]}</label>
          {key === "blurb" ? <textarea {...props} rows={3} maxLength={MEETUP_LIMITS.blurb} />
            : <input {...props} placeholder={key==='title'?'What are you studying?':key==='location'?'Building, room, or meeting link':undefined} ref={key === "title" ? title : undefined} type={key === "date" || key === "time" ? key : "text"}
              maxLength={key === "title" || key === "location" ? MEETUP_LIMITS[key] : undefined} />}
          {state.errors?.[key] && <p id={`${id}-${key}-error`} className={styles.error}>{state.errors[key]}</p>}
        </div>;
      })}
      <p className={styles.timezone}>Date and time use campus time (Pacific).</p>
      <div className={styles.buttons}>
        <button className={styles.primary} type="submit">{pending ? "Creating…" : "Post meetup"}</button>
        <button className={styles.secondary} type="button" onClick={() => onClose()}>Cancel</button>
      </div>
    </fieldset>
    {state.message && !state.ok && <p ref={errorSummary} tabIndex={-1} role="alert" className={styles.error}>{state.message}</p>}
  </form>;
}

export function ClassRsvp({ spaceId, subspaceId, meetupId, joined, hosting }: { spaceId: string; subspaceId: string; meetupId: string; joined: boolean; hosting: boolean }) {
  const [state, action, pending] = useActionState(classMeetupRsvp.bind(null, spaceId, subspaceId, meetupId), initial);
  if (hosting) return <span className={styles.badge}>Hosting</span>;
  return <form action={action} className={styles.rsvp} aria-busy={pending}>
    <input type="hidden" name="intent" value={joined ? "leave" : "join"} />
    <button className={joined ? styles.secondary : styles.primary} disabled={pending}>{pending ? "Updating…" : joined ? "Leave session" : "Join session"}</button>

    {state.message && <p role={state.ok ? "status" : "alert"} className={styles.hint}>{state.message}</p>}
  </form>;
}
