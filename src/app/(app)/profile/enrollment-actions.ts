"use server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordId, type ActionResult } from "@/lib/feed";

export async function updateEnrollment(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = recordId(form.get("section_id"));
  const intent = form.get("intent");
  if (!id || (intent !== "add" && intent !== "remove")) return { ok: false, message: "Select a class and professor first." };
  try {
    const db = await createClient();
    const target = await db.from("sections").select("course_id,professor_id").eq("id", id).single();
    if (target.error || !target.data) return {ok:false,message:"This class is unavailable. Please search again."};
    const siblings = await db.from("sections").select("id").eq("course_id",target.data.course_id).eq("professor_id",target.data.professor_id).order("id");
    if (siblings.error || !siblings.data?.length) return {ok:false,message:"Your classes couldn’t be updated. Please try again."};
    const ids = siblings.data.map(section=>section.id);
    // Legacy storage references sections; a stable representative enrolls the whole professor group.
    // Removing the group clears every legacy section membership in that exact pair.
    const existing = intent === "add" ? await db.from("enrollments").select("section_id").eq("user_id",user.id).in("section_id",ids).limit(1) : {data:[],error:null};
    if (existing.error) return {ok:false,message:"Your classes couldn’t be updated. Please try again."};
    const result = intent === "add"
      ? existing.data?.length ? {error:null} : await db.from("enrollments").upsert({user_id:user.id,section_id:ids[0]}, {onConflict:"user_id,section_id",ignoreDuplicates:true})
      : await db.from("enrollments").delete().eq("user_id",user.id).in("section_id",ids);
    if (result.error && !(intent === "add" && result.error.code === "23505")) return { ok: false, message: "Your classes couldn’t be updated. Refresh the page and try again." };
    revalidatePath("/", "layout");
    return { ok: true, message: intent === "add" ? "Class added. You can open it from the class dropdown." : "Class removed." };
  } catch { return { ok: false, message: "Your classes couldn’t be updated. Please try again." }; }
}
