import Link from "next/link";

// Login restricted to @calpoly.edu with email verification (spec §4).
// TODO(auth): wire to a real auth flow.
export default function LoginPage() {
  return (
    <form className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="you@calpoly.edu"
        className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        type="password"
        placeholder="Password"
        className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 py-2 font-medium text-white"
      >
        Log in
      </button>
      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-emerald-600">
          Sign up
        </Link>
      </p>
    </form>
  );
}
