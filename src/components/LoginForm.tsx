"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!/^[^@\s]+@calpoly\.edu$/i.test(email)) {
      setError("Use your @calpoly.edu email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/spaces");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input required name="email" type="email" autoComplete="email" placeholder="you@calpoly.edu" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      <input required name="password" type="password" autoComplete="current-password" placeholder="Password" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button disabled={submitting} className="rounded-lg bg-emerald-600 py-2 font-medium text-white disabled:opacity-60">
        {submitting ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
