import AuthLogout from "@/components/AuthLogout";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import Link from "next/link";
import EnrollmentForm from "@/components/EnrollmentForm";
import type { CourseSection } from "@/lib/feed";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("profiles").select("name,major,interests,avatar_url").eq("id", user.id).single();
  const { course = "" } = await searchParams;
  const search = course.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40);
  const sectionSelect = "id,section_code,courses!inner(code,title,term),professors!inner(name)";
  let catalogQuery = supabase.from("sections").select(sectionSelect);
  if (search) catalogQuery = catalogQuery.ilike("courses.code", `%${search}%`);
  const [catalog, memberships] = await Promise.all([
    catalogQuery.order("id").limit(100).returns<CourseSection[]>(),
    supabase.from("enrollments").select("section_id").eq("user_id", user.id),
  ]);
  const enrolledIds = (memberships.data || []).map(item => item.section_id);
  const enrolled = enrolledIds.length ? await supabase.from("sections").select(sectionSelect).in("id", enrolledIds).returns<CourseSection[]>() : { data: [], error: null };
  return <main className="profile-page">
    <header className="page-heading"><h1>Profile</h1><p>Manage your classes, professors, and personal details.</p></header>
    <form action="/profile#classes" className="enrollment-search"><label className="workspace-field">Find a course<input name="course" defaultValue={search} placeholder="Course code, e.g. CSC 202" maxLength={40} className="workspace-input" /></label><button className="workspace-secondary">Search</button></form>
    {catalog.error || memberships.error || enrolled.error ? <p role="alert" className="workspace-notice">Your classes couldn’t be loaded. Please refresh and try again.</p> : <><EnrollmentForm sections={catalog.data || []} enrolled={enrolled.data || []} />{catalog.data?.length === 100 && <p className="workspace-hint">Showing up to 100 sections. Search by course code to narrow the list.</p>}</>}
    {error || !profile ? <p role="alert">Your profile could not be loaded. Please refresh and try again.</p> : <ProfileForm profile={profile} email={user.email || ""} />}
    <div className="profile-account"><Link className="workspace-back" href="/settings">Notification settings</Link><AuthLogout /></div>
  </main>;
}
