import Link from "next/link";

// Sign up with Cal Poly email → verification email → pick classes (spec §6.1).
// TODO(auth): validate @calpoly.edu, create user, send verification email.
export default function SignupPage() {
  return (
    <form className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Name"
        className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
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
        Create account
      </button>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-600">
          Log in
        </Link>
      </p>
    </form>
  );
}
