"use server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordId, type ActionResult } from "@/lib/feed";

export async function rsvp(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = recordId(form.get("meetup_id"));
  const intent = form.get("intent");
  if (!id || (intent !== "join" && intent !== "leave")) return { ok: false, message: "Choose a meetup and try again." };
  try {
    const db = await createClient();
    // Read with the viewer's session: RLS verifies both course and professor membership.
    const { data: meetup, error } = await db.from("meetups").select("id,creator_id,starts_at").eq("id", id).single();
    if (error || !meetup) return { ok: false, message: "This meetup is no longer available to you. Refresh your feed." };
    if (meetup.creator_id === user.id) return { ok: false, message: "You’re hosting this meetup." };
    if (new Date(meetup.starts_at).getTime() <= Date.now()) return { ok: false, message: "This meetup has already started. RSVPs are closed." };
    const result = intent === "join"
      ? await db.from("meetup_attendees").insert({ meetup_id: id, user_id: user.id })
      : await db.from("meetup_attendees").delete().eq("meetup_id", id).eq("user_id", user.id);
    if (result.error && !(intent === "join" && result.error.code === "23505")) return { ok: false, message: "Your RSVP couldn’t be updated. Please try again." };
    revalidatePath("/spaces", "layout");
    return { ok: true, message: intent === "join" ? "You’re going." : "Your RSVP was cancelled." };
  } catch { return { ok: false, message: "Your RSVP couldn’t be updated. Please try again." }; }
}
