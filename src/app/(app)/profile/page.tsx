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
  const name: string = profile?.name || "Your profile";
  const initials = name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
  /* eslint-disable @next/next/no-img-element -- User-provided HTTPS avatar loads directly with no referrer. */
  return <main className="student-profile">
    <div className="student-cover"><span>YOUR CORNER OF CAMPUS</span><span aria-hidden="true">✳</span></div>
    {error || !profile ? <p role="alert" className="workspace-notice">Your profile could not be loaded. Please refresh and try again.</p> : <>
      <div className="student-identity">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile picture" referrerPolicy="no-referrer" className="student-avatar" /> : <span className="student-avatar" aria-hidden="true">{initials}</span>}
        <h1>{name}</h1><p>{profile.major || "Cal Poly student"}<span> · Cal Poly</span></p>
        {profile.interests && <p className="student-interests">{profile.interests}</p>}
      </div>
      <details className="student-edit"><summary>Edit profile</summary><ProfileForm profile={profile} email={user.email || ""}/></details>
    </>}
    {catalog.error || memberships.error || enrolled.error ? <p role="alert" className="workspace-notice">Your classes couldn’t be loaded. Please refresh and try again.</p> : <EnrollmentForm key={search} compact searchOpen={!!search} sections={catalog.data || []} enrolled={enrolled.data || []} search={<>
      <form action="/profile#classes" className="enrollment-search"><label className="workspace-field">Find a course<input name="course" defaultValue={search} placeholder="Course code, e.g. CSC 202" maxLength={40} className="workspace-input" /></label><button className="workspace-secondary">Search</button></form>
      {catalog.data?.length === 100 && <p className="workspace-hint">Search by course code to narrow the list.</p>}
    </>} />}
    <div className="student-account"><Link href="/settings">Notifications <span aria-hidden="true">→</span></Link><AuthLogout/></div>
  </main>;
}
