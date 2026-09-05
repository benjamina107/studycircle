"use client";
import { useActionState } from "react";
import { rsvp } from "@/app/(app)/spaces/actions";

export default function FeedRsvp({ id, joined, hosting, started }: { id: string; joined: boolean; hosting: boolean; started: boolean }) {
  const [state, action, pending] = useActionState(rsvp, { ok: false, message: "" });
  if (hosting) return <span className="feed-badge">You’re hosting</span>;
  if (started) return <span className="workspace-hint">{joined ? "You RSVPed · " : ""}RSVPs closed</span>;
  return <form action={action} className="feed-rsvp">
    <input type="hidden" name="meetup_id" value={id} /><input type="hidden" name="intent" value={joined ? "leave" : "join"} />
    <button className={joined ? "workspace-secondary" : "workspace-button"} disabled={pending}>{pending ? "Updating…" : joined ? "Cancel RSVP" : "RSVP"}</button>
    {joined && <span className="feed-badge">Going</span>}
    {state.message && <p role={state.ok ? "status" : "alert"} className="workspace-hint">{state.message}</p>}
  </form>;
}
