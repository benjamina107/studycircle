import Link from "next/link";

// Profile: name, major, interests, picture (spec §6.1).
// TODO(db): load the signed-in user's profile.
export default function ProfilePage() {
  return (
    <main>
      <h1 className="mb-4 text-xl font-bold">Profile</h1>
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl dark:bg-emerald-900">
          🎓
        </div>
        <div>
          <p className="font-semibold">Mustang Student</p>
          <p className="text-sm text-zinc-500">Computer Science · junior</p>
        </div>
      </div>
      <Link
        href="/settings"
        className="mt-4 block rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        ⚙️ Settings
      </Link>
    </main>
  );
}
