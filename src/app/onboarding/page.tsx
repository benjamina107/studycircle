import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ClassSetup from "@/components/ClassSetup";
import OnboardingForm from "@/components/OnboardingForm";
import BrandMark from "@/components/BrandMark";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./onboarding.css";
import AuthLogout from "@/components/AuthLogout";

export default async function OnboardingPage({searchParams}:{searchParams:Promise<{step?:string}>}) {
  const classes=(await searchParams).step==="classes";
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles")
    .select("name,major,interests,avatar_url,onboarding_completed_at").eq("id", user.id).single();
  if (error || !profile) return <main className="onboarding-shell"><p role="alert" className="workspace-notice">Your profile could not be loaded. Please refresh and try again.</p></main>;
  if (profile.onboarding_completed_at && !classes) redirect("/profile");
  if (classes && !profile.name?.trim()) redirect("/onboarding");
  return <main className="onboarding-shell">
    <header className="onboarding-header"><Link href="/" className="onboarding-brand" aria-label="StudyCircle home"><BrandMark size={36} alt="" />study<span>circle</span></Link><AuthLogout /></header>
    <section className={`onboarding-card ${classes ? "onboarding-class-card" : ""}`} aria-labelledby="onboarding-title">
      <nav className="onboarding-steps" aria-label="Setup progress"><span aria-current={!classes ? "step" : undefined}>1 · Your profile</span><span aria-current={classes ? "step" : undefined}>2 · Your classes</span></nav>
      {classes ? <ClassSetup /> : <>
      <p className="onboarding-eyebrow">WELCOME TO STUDYCIRCLE</p>
      <h1 id="onboarding-title">Make your profile yours.</h1>
      <p className="onboarding-intro">A few details help classmates recognize you. You can edit them any time from Profile.</p>
      <OnboardingForm initialValues={{ name: profile.name || "", major: profile.major || "", interests: profile.interests || "", avatar_url: profile.avatar_url || "" }} />
      </>}
    </section>
  </main>;
}
