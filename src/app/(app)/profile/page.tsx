import AuthLogout from "@/components/AuthLogout";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import Link from "next/link";
import EnrollmentForm from "@/components/EnrollmentForm";
import type { CourseSection } from "@/lib/feed";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles").select("name,major,interests,avatar_url").eq("id", user.id).single();
  // The catalog is searched from the client as the student types, so only their own classes load here.
  const sectionSelect = "id,section_code,courses!inner(code,title,term),professors!inner(name)";
  const memberships = await supabase.from("enrollments").select("section_id").eq("user_id", user.id);
  const enrolledIds = (memberships.data || []).map(item => item.section_id);
  const enrolled = enrolledIds.length ? await supabase.from("sections").select(sectionSelect).in("id", enrolledIds).returns<CourseSection[]>() : { data: [], error: null };
  return <main className="profile-page">
    <header className="page-heading"><h1>Profile</h1><p>Manage your classes, professors, and personal details.</p></header>
    {memberships.error || enrolled.error ? <p role="alert" className="workspace-notice">Your classes couldn’t be loaded. Please refresh and try again.</p> : <EnrollmentForm enrolled={enrolled.data || []} />}
    {error || !profile ? <p role="alert">Your profile could not be loaded. Please refresh and try again.</p> : <ProfileForm profile={profile} email={user.email || ""} />}
    <div className="profile-account"><Link className="workspace-back" href="/settings">Notification settings</Link><AuthLogout /></div>
  </main>;
}
