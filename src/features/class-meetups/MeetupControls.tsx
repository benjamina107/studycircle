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
  return <div>
    <button ref={button} type="button" className={styles.primary} disabled={busy} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); setMessage(""); }}>Create meetup</button>
    <div id={id}>
      {open && <CreationForm spaceId={spaceId} subspaceId={subspaceId} onClose={close} onPending={setBusy} />}
    </div>
    <p role="status" className={styles.hint}>{message}</p>
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
  const labels: Record<keyof Draft, string> = { title: "Title", blurb: "Description (optional)", location: "Location", date: "Date", time: "Time" };
  return <form action={action} className={styles.form} aria-labelledby={`${id}-heading`} aria-busy={pending}>
    <h2 id={`${id}-heading`}>Plan a class meetup</h2>
    <p id={`${id}-zone`} className={styles.hint}>Dates and times are in Pacific time.</p>
    <fieldset disabled={pending} className={styles.fields}>
      {(Object.keys(labels) as (keyof Draft)[]).map(key => {
        const props = {
          id: `${id}-${key}`, name: key, value: draft[key], required: key !== "blurb",
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [key]: event.target.value })),
          "aria-invalid": !!state.errors?.[key],
          "aria-describedby": `${key === "date" || key === "time" ? `${id}-zone ` : ""}${state.errors?.[key] ? `${id}-${key}-error` : ""}`.trim() || undefined,
        };
        return <div key={key} className={styles.field}>
          <label htmlFor={props.id}>{labels[key]}</label>
          {key === "blurb" ? <textarea {...props} rows={3} maxLength={MEETUP_LIMITS.blurb} />
            : <input {...props} ref={key === "title" ? title : undefined} type={key === "date" || key === "time" ? key : "text"}
              maxLength={key === "title" || key === "location" ? MEETUP_LIMITS[key] : undefined} />}
          {state.errors?.[key] && <p id={`${id}-${key}-error`} className={styles.error}>{state.errors[key]}</p>}
        </div>;
      })}
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
  if (hosting) return <span className={styles.badge}>You’re hosting · Going</span>;
  return <form action={action} className={styles.rsvp} aria-busy={pending}>
    <input type="hidden" name="intent" value={joined ? "leave" : "join"} />
    <button className={joined ? styles.secondary : styles.primary} disabled={pending}>{pending ? "Updating…" : joined ? "Cancel RSVP" : "RSVP"}</button>
    {joined && <span className={styles.badge}>Going</span>}
    {state.message && <p role={state.ok ? "status" : "alert"} className={styles.hint}>{state.message}</p>}
  </form>;
}
