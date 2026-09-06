import ClassHeader from "@/components/ClassHeader";
import { classContext } from "@/lib/class-context";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuthLogout from "@/components/AuthLogout";
import Link from "next/link";
import "./workspace.css";

// One enrolled course/professor workspace at a time.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (profileError || !profile) return <div className="workspace"><main className="group-content"><div className="workspace-notice" role="alert">Your profile is temporarily unavailable. Please refresh and try again.<div className="profile-account"><Link className="workspace-secondary" href="/">Refresh</Link><AuthLogout /></div></div></main></div>;
  if (profile && !profile.onboarding_completed_at) redirect("/onboarding");
  const context = await classContext().catch(() => null);
  return <div className="workspace"><ClassHeader groups={context?.groups || []} selectedId={context?.selected?.id} loadFailed={!context} /><div id="workspace-main" className="group-content">{children}</div></div>;
}
