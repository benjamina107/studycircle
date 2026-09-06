"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EVENTS = ["MEETUP_JOIN", "NEW_MESSAGE", "MENTION", "EXAM_REMINDER"] as const;

export async function saveNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save notification settings.");
  const { error } = await supabase.from("notification_settings").upsert(
    EVENTS.map((event) => ({ user_id: user.id, event, email_enabled: formData.get(event) === "on" })),
    { onConflict: "user_id,event" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
