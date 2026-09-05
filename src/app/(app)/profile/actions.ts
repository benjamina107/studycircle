"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { avatarInput, InputError, textInput } from "@/app/api/auth/validation";

export async function saveProfile(_previous: { message: string; ok: boolean }, form: FormData) {
  const user = await requireUser();
  try {
    const profile = {
      name: textInput(form.get("name"), "Name", 100, true),
      major: textInput(form.get("major"), "Major", 120),
      interests: textInput(form.get("interests"), "Interests", 500),
      avatar_url: avatarInput(form.get("avatar_url")),
    };
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").update(profile).eq("id", user.id).select("id").single();
    if (error || !data) return { message: "Your profile could not be saved. Please try again.", ok: false };
    revalidatePath("/profile");
    return { message: "Profile saved.", ok: true };
  } catch (error) {
    return { message: error instanceof InputError ? error.message : "Your profile could not be saved. Please try again.", ok: false };
  }
}
