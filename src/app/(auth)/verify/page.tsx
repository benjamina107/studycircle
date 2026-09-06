import AuthLinkNotice from "@/components/AuthLinkNotice";
import {getCurrentUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import AuthCodeVerify from "@/components/AuthCodeVerify";
import AuthVerify from "@/components/AuthVerify";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) return <p role="status">Email confirmation is currently unavailable. Please try again later.</p>;
  if (await getCurrentUser()) redirect("/profile");
  const query = await searchParams;
  const tokenHash = typeof query.token_hash === "string" ? query.token_hash : "";
  const type = typeof query.type === "string" ? query.type : "email";
  const usableToken = /^[a-zA-Z0-9_-]{20,256}$/.test(tokenHash) && ["signup", "email"].includes(type);
  const errorMessage = query.error || tokenHash || query.type
    ? type === "recovery"
      ? "This is a password recovery link. Password reset is not available here yet. Return to login or contact the StudyCircle team for help."
      : "We couldn’t confirm your email with this link. If you already confirmed it, try logging in. Otherwise, request another email below."
    : "";
  return <>
    {usableToken ? <AuthVerify tokenHash={tokenHash} type={type} /> : <AuthLinkNotice errorMessage={errorMessage} />}
    {!usableToken && <AuthCodeVerify />}
  </>;
}
