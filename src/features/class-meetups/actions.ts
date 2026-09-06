"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordId } from "@/lib/feed";
import { CAMPUS_TIME_ZONE } from "@/lib/meetups-validation";
import { canAccessClass } from "./access";
import { validateCreation, type Result } from "./validation";

const unavailable: Result = { ok: false, message: "This class is unavailable. Refresh and check your enrollment." };

export async function createClassMeetup(spaceId: string, subspaceId: string, _previous: Result, form: FormData): Promise<Result> {
  // Keep redirect control flow outside the error handler; never trust bound IDs.
  const user = await requireUser();
  const validated = validateCreation(form, Date.now());
  if (!validated.ok) return { ok: false, message: "Check the highlighted fields.", errors: validated.errors };
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) return unavailable;
    // Migration 003 is required. One insert only; its trigger adds the host and
    // enforces the atomic daily cap. Never retry without time_zone.
    const { error } = await db.from("meetups").insert({
      ...validated.value, subspace_id: subspaceId, creator_id: user.id,
      time_zone: CAMPUS_TIME_ZONE,
    });
    if (error) return { ok: false, message: error.code === "P0001"
      ? "You’ve reached the daily limit of 5 meetups. Try again tomorrow (UTC)."
      : "We couldn’t create your meetup. Please try again later." };
  } catch {
    return { ok: false, message: "We couldn’t create your meetup. Please try again later." };
  }
  revalidatePath("/spaces", "layout");
  return { ok: true, message: "Meetup created. You’re going as the host." };
}

export async function classMeetupRsvp(spaceId: string, subspaceId: string, meetupId: string, _previous: Result, form: FormData): Promise<Result> {
  const user = await requireUser();
  const intent = form.get("intent");
  if (!recordId(meetupId) || (intent !== "join" && intent !== "leave")) return { ok: false, message: "Choose a valid RSVP action." };
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) return unavailable;
    const { data, error } = await db.from("meetups").select("id,creator_id,starts_at,cancelled_at")
      .eq("id", meetupId).eq("subspace_id", subspaceId).maybeSingle();
    if (error || !data) return { ok: false, message: "This meetup is no longer available in this class." };
    if (data.cancelled_at) return { ok: false, message: "This meetup was cancelled." };
    if (data.creator_id === user.id) return { ok: false, message: "You’re hosting this meetup." };
    if (!(Date.parse(data.starts_at) > Date.now())) return { ok: false, message: "This meetup has started. RSVPs are closed." };
    const response = intent === "join"
      ? await db.from("meetup_attendees").insert({ meetup_id: meetupId, user_id: user.id })
      : await db.from("meetup_attendees").delete().eq("meetup_id", meetupId).eq("user_id", user.id);
    if (response.error && !(intent === "join" && response.error.code === "23505")) {
      return { ok: false, message: "Your RSVP couldn’t be updated. Please try again." };
    }
  } catch {
    return { ok: false, message: "Your RSVP couldn’t be updated. Please try again." };
  }
  revalidatePath("/spaces", "layout");
  return { ok: true, message: intent === "join" ? "You’re going." : "Your RSVP was cancelled." };
}

export async function updateClassMeetup(spaceId: string, subspaceId: string, meetupId: string, _previous: Result, form: FormData): Promise<Result> {
  const user = await requireUser();
  if (!recordId(meetupId)) return { ok: false, message: "Choose a valid meetup." };
  const validated = validateCreation(form, Date.now());
  if (!validated.ok) return { ok: false, message: "Check the highlighted fields.", errors: validated.errors };
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) return unavailable;
    const { data, error } = await db.from("meetups").select("id,creator_id,cancelled_at,starts_at")
      .eq("id", meetupId).eq("subspace_id", subspaceId).maybeSingle();
    if (error || !data || data.creator_id !== user.id) return { ok: false, message: "Only the organizer can edit this meetup." };
    if (data.cancelled_at) return { ok: false, message: "Cancelled meetups can’t be edited." };
    if (!(Date.parse(data.starts_at) > Date.now())) return { ok: false, message: "Meetups that have started can’t be edited." };
    const response = await db.from("meetups").update(validated.value).eq("id", meetupId).eq("creator_id", user.id);
    if (response.error) return { ok: false, message: "We couldn’t update this meetup. Please try again later." };
  } catch {
    return { ok: false, message: "We couldn’t update this meetup. Please try again later." };
  }
  revalidatePath("/spaces", "layout");
  return { ok: true, message: "Meetup details updated." };
}

export async function cancelClassMeetup(spaceId: string, subspaceId: string, meetupId: string, _previous: Result, _form: FormData): Promise<Result> {
  const user = await requireUser();
  if (!recordId(meetupId)) return { ok: false, message: "Choose a valid meetup." };
  try {
    const db = await createClient();
    if (!await canAccessClass(db, spaceId, subspaceId)) return unavailable;
    const { data, error } = await db.from("meetups").select("id,creator_id,cancelled_at")
      .eq("id", meetupId).eq("subspace_id", subspaceId).maybeSingle();
    if (error || !data || data.creator_id !== user.id) return { ok: false, message: "Only the organizer can cancel this meetup." };
    if (data.cancelled_at) return { ok: true, message: "This meetup is already cancelled." };
    const response = await db.from("meetups").update({ cancelled_at: new Date().toISOString() }).eq("id", meetupId).eq("creator_id", user.id).is("cancelled_at", null);
    if (response.error) return { ok: false, message: "We couldn’t cancel this meetup. Please try again later." };
  } catch {
    return { ok: false, message: "We couldn’t cancel this meetup. Please try again later." };
  }
  revalidatePath("/spaces", "layout");
  return { ok: true, message: "Meetup cancelled. Attendees can see that it is no longer happening." };
}
