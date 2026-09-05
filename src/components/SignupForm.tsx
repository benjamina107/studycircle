"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CAL_POLY_EMAIL = /^[^@\s]+@calpoly\.edu$/i;

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!name || !CAL_POLY_EMAIL.test(email)) {
      setError("Use your @calpoly.edu email and enter your name.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/verify`,
      },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input required name="name" type="text" autoComplete="name" placeholder="Name" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input required name="email" type="email" autoComplete="email" placeholder="you@calpoly.edu" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input required name="password" type="password" minLength={12} autoComplete="new-password" placeholder="Password (12+ characters)" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button disabled={submitting} className="rounded-lg bg-emerald-600 py-2 font-medium text-white disabled:opacity-60">
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
