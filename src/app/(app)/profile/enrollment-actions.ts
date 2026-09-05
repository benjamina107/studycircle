"use server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordId, type ActionResult } from "@/lib/feed";

export async function updateEnrollment(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = recordId(form.get("section_id"));
  const intent = form.get("intent");
  if (!id || (intent !== "add" && intent !== "remove")) return { ok: false, message: "Select a class section first." };
  try {
    const db = await createClient();
    const result = intent === "add"
      ? await db.from("enrollments").insert({ user_id: user.id, section_id: id })
      : await db.from("enrollments").delete().eq("user_id", user.id).eq("section_id", id);
    if (result.error && !(intent === "add" && result.error.code === "23505")) return { ok: false, message: "Your classes couldn’t be updated. Refresh the page and try again." };
    revalidatePath("/profile"); revalidatePath("/spaces", "layout"); revalidatePath("/chats");
    return { ok: true, message: intent === "add" ? "Class added. Your feed now includes its professor group." : "Class removed. Your feed has been updated." };
  } catch { return { ok: false, message: "Your classes couldn’t be updated. Please try again." }; }
}
