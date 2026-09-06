import AuthForm from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default function SignupPage() {
  if (!isSupabaseConfigured()) return <p role="status">Signup is currently unavailable. Please try again later.</p>;
  return <AuthForm mode="signup" />;
}
