import AuthForm from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
<<<<<<< HEAD
export const dynamic = "force-dynamic";
export default function LoginPage() {
=======
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
>>>>>>> f6f3721380b114a340dc1d9a58667cd2bb2fc2d9
  if (!isSupabaseConfigured()) return <p role="status">Login is currently unavailable. Please try again later.</p>;
  const query = await searchParams;
  return <>
    {query.reason === "session" && <p role="status" className="auth-status">Please log in to continue. Your session may have ended.</p>}
    <AuthForm mode="login" />
  </>;
}
