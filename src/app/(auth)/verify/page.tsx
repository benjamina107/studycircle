import AuthForm from "@/components/AuthForm";
import AuthVerify from "@/components/AuthVerify";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) return <p role="status">Email confirmation is currently unavailable. Please try again later.</p>;
  const query = await searchParams;
  const tokenHash = typeof query.token_hash === "string" ? query.token_hash : "";
  const type = typeof query.type === "string" ? query.type : "email";
  return <>
    {tokenHash ? <AuthVerify tokenHash={tokenHash} type={type} /> : <div className="auth-confirm">
      <h2>Check your inbox.</h2>
      <p>Open the confirmation link in your Cal Poly email. If you don’t see it, take a quick look in spam.</p>
      {query.error && <p role="alert" className="auth-status">We couldn’t confirm your email. Try opening the link again in the browser where you signed up. If that doesn’t work, request another email below or try logging in.</p>}
    </div>}
    <AuthForm mode="resend" />
  </>;
}
