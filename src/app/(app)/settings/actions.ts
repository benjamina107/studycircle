"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EVENTS = ["MEETUP_JOIN", "NEW_MESSAGE", "MENTION", "EXAM_REMINDER"] as const;

export async function saveNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save notification settings.");
  // PostgREST merge-upserts also UPDATE the conflict keys (user_id/event).
  // The database grants UPDATE only on email_enabled. Insert missing rows
  // without merging, then update only the permitted preference column.
  const { error } = await supabase.from("notification_settings").upsert(
    EVENTS.map((event) => ({ user_id: user.id, event, email_enabled: formData.get(event) === "on" })),
    { onConflict: "user_id,event", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  for (const emailEnabled of [true, false]) {
    const events = EVENTS.filter((event) => (formData.get(event) === "on") === emailEnabled);
    if (!events.length) continue;
    const { error: updateError } = await supabase.from("notification_settings")
      .update({ email_enabled: emailEnabled })
      .eq("user_id", user.id)
      .in("event", events);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath("/settings");
}
