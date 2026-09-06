import {getCurrentUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default async function SignupPage() {
  if (!isSupabaseConfigured()) return <p role="status">Signup is currently unavailable. Please try again later.</p>;
  if (await getCurrentUser()) redirect("/profile");
  return <AuthForm mode="signup" />;
}
