"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { campusDateTime, MEETUP_LIMITS } from "@/lib/meetups-validation";
import { cancelClassMeetup, classMeetupRsvp, createClassMeetup, updateClassMeetup } from "./actions";
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

type OrganizerMeetup = { id: string; title: string; blurb: string | null; location_name: string; starts_at: string; cancelled_at: string | null };

export function OrganizerControls({ spaceId, subspaceId, meetup, inactive }: { spaceId: string; subspaceId: string; meetup: OrganizerMeetup; inactive: boolean }) {
  const [editing, setEditing] = useState(false);
  const editDialog = useRef<HTMLDialogElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const editDialogId = useId();
  useEffect(() => {
    if (editing) editDialog.current?.showModal();
    else if (editDialog.current?.open) {
      editDialog.current.close();
      editButton.current?.focus();
    }
  }, [editing]);
  const router = useRouter();
  const [cancelState, cancelAction, cancelling] = useActionState(async (previous: Result, form: FormData) => {
    const result = await cancelClassMeetup(spaceId, subspaceId, meetup.id, previous, form);
    if (result.ok) router.refresh();
    return result;
  }, initial);
  const local = campusDateTime(Date.parse(meetup.starts_at));
  const [state, action, pending] = useActionState(async (previous: Result, form: FormData) => {
    const result = await updateClassMeetup(spaceId, subspaceId, meetup.id, previous, form);
    if (result.ok) { setEditing(false); router.refresh(); }
    return result;
  }, initial);
  if (inactive) return <span className={styles.hint}>{meetup.cancelled_at ? 'You cancelled this meetup.' : 'This meetup has ended.'}</span>;
  return <div className={styles.organizer}>
    <span className={styles.badge}>You’re hosting · Going</span>
    <div className={styles.buttons}>
      <button type="button" ref={editButton} className={styles.secondary} disabled={cancelling} onClick={() => setEditing(true)} aria-haspopup="dialog" aria-controls={editDialogId}>Edit details</button>
      <form action={cancelAction}><button className={styles.danger} disabled={cancelling}>{cancelling ? "Cancelling…" : "Cancel meetup"}</button></form>
    </div>
    {cancelState.message && <p role={cancelState.ok ? "status" : "alert"} className={styles.hint}>{cancelState.message}</p>}
    <dialog ref={editDialog} id={editDialogId} className={styles.dialog} aria-labelledby={`${editDialogId}-heading`} onCancel={event=>{event.preventDefault();if(!pending)setEditing(false);}} onClose={()=>setEditing(false)}>
      <button type="button" className={styles.close} disabled={pending} aria-label="Close edit meetup" onClick={()=>setEditing(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    {editing && <form action={action} className={styles.form} aria-busy={pending}>
      <h2 id={`${editDialogId}-heading`}>Edit meetup</h2>
      <p className={styles.hint}>Dates and times are in Pacific time.</p>
      <fieldset disabled={pending} className={styles.fields}>
        <div className={styles.field}><label htmlFor={`title-${meetup.id}`}>Title</label><input id={`title-${meetup.id}`} name="title" defaultValue={meetup.title} maxLength={MEETUP_LIMITS.title} required /></div>
        <div className={styles.field}><label htmlFor={`blurb-${meetup.id}`}>Description (optional)</label><textarea id={`blurb-${meetup.id}`} name="blurb" defaultValue={meetup.blurb ?? ""} maxLength={MEETUP_LIMITS.blurb} rows={3} /></div>
        <div className={styles.field}><label htmlFor={`location-${meetup.id}`}>Location</label><input id={`location-${meetup.id}`} name="location" defaultValue={meetup.location_name} maxLength={MEETUP_LIMITS.location} required /></div>
        <div className={styles.field} data-field="date"><label htmlFor={`date-${meetup.id}`}>Date</label><input id={`date-${meetup.id}`} name="date" type="date" defaultValue={local.date} required /></div>
        <div className={styles.field} data-field="time"><label htmlFor={`time-${meetup.id}`}>Time</label><input id={`time-${meetup.id}`} name="time" type="time" defaultValue={local.time} required /></div>
        <div className={styles.buttons}><button className={styles.primary}>{pending ? "Saving…" : "Save changes"}</button><button type="button" className={styles.secondary} onClick={() => setEditing(false)}>Close</button></div>
      </fieldset>
      {state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? styles.hint : styles.error}>{state.message}</p>}
    </form>}
    </dialog>
  </div>;
}
