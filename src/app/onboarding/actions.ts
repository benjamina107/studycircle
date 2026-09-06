"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateProfile } from "@/app/api/auth/validation";

export type OnboardingState = {
  message: string;
  ok: boolean;
  values?: { name: string; major: string; interests: string; avatar_url: string };
  errors?: Partial<Record<"name" | "major" | "interests" | "avatar_url", string>>;
};

export async function completeOnboarding(_previous: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await requireUser();
  const validation = validateProfile(form);
  if (Object.keys(validation.errors).length) return { ok: false, message: "Please check the highlighted fields.", values: validation.values, errors: validation.errors };
  try {
    const profile = { ...validation.profile, onboarding_completed_at: new Date().toISOString() };
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").update(profile)
      .eq("id", user.id).select("id").single();
    if (error || !data) return { ok: false, message: "Your profile could not be saved. Please try again.", values: validation.values, errors: {} };
    revalidatePath("/profile");
  } catch {
    return { ok: false, message: "Your profile could not be saved. Please try again.", values: validation.values, errors: {} };
  }
  redirect("/profile");
}
