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
  if (!validation.profile || Object.keys(validation.errors).length) return { ok: false, message: "Please check the highlighted fields.", values: validation.values, errors: validation.errors };
  try {
    const profile = validation.profile;
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").update(profile)
      .eq("id", user.id).select("id").single();
    if (error || !data) return { ok: false, message: "Your profile could not be saved. Please try again.", values: validation.values, errors: {} };
    revalidatePath("/profile");
  } catch {
    return { ok: false, message: "Your profile could not be saved. Please try again.", values: validation.values, errors: {} };
  }
  redirect("/onboarding?step=classes");
}

export async function finishOnboarding(sectionIds: string[]): Promise<{ok:boolean;message:string}> {
  const user=await requireUser();
  if(!Array.isArray(sectionIds)||sectionIds.length>30||sectionIds.some(id=>typeof id!=="string"||!id||id.length>200))return {ok:false,message:"Choose up to 30 classes."};
  const db=await createClient();
  const {data:profile,error:profileError}=await db.from("profiles").select("name").eq("id",user.id).single();
  if(profileError||!profile?.name?.trim())return {ok:false,message:"Please save your name in the profile step first."};
  try {
    if(sectionIds.length){
      const ids=[...new Set(sectionIds)];
      const {data:sections,error}=await db.from("sections").select("id,course_id,professor_id").in("id",ids);
      if(error||!sections||sections.length!==ids.length||sections.some(s=>!s.professor_id))return {ok:false,message:"One of these classes is no longer available. Please check your choices."};
      const {data:existing,error:existingError}=await db.from("enrollments").select("sections(course_id,professor_id)").eq("user_id",user.id).returns<{sections:{course_id:string;professor_id:string}}[]>();
      if(existingError)throw existingError;
      const pairs=new Set((existing||[]).map(e=>JSON.stringify([e.sections.course_id,e.sections.professor_id])));
      const additions=sections.filter(s=>{const pair=JSON.stringify([s.course_id,s.professor_id]);if(pairs.has(pair))return false;pairs.add(pair);return true;});
      if(additions.length){
        const {error:addError}=await db.from("enrollments").upsert(additions.map(s=>({user_id:user.id,section_id:s.id})),{onConflict:"user_id,section_id",ignoreDuplicates:true});
        if(addError)throw addError;
      }
    }
    const {data,error}=await db.from("profiles").update({onboarding_completed_at:new Date().toISOString()}).eq("id",user.id).select("id").single();
    if(error||!data)throw error||new Error();
    revalidatePath("/","layout");
    return {ok:true,message:"Your classes are ready."};
  }catch{return {ok:false,message:"We couldn’t finish setting up your classes. Your choices are still here; please try again."};}
}
