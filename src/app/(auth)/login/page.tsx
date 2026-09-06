import AuthForm from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default function LoginPage() {
  if (!isSupabaseConfigured()) return <p role="status">Login is currently unavailable. Please try again later.</p>;
  return <AuthForm mode="login" />;
}
