import {getCurrentUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) return <p role="status">Login is currently unavailable. Please try again later.</p>;
  const query = await searchParams;
  if (await getCurrentUser()) redirect("/profile");
  return <>
    {query.reason === "session" && <p role="status" className="auth-status">Please log in to continue. Your session may have ended.</p>}
    <AuthForm mode="login" />
  </>;
}
