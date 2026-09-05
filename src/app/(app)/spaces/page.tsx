import Link from "next/link";
import { mockSpaces } from "@/lib/mock-data";

// Your Spaces — one per enrolled course, predefined from the catalog (spec §5).
// TODO(db): replace mock data with the user's enrollments via db.ts.
export default function SpacesPage() {
  return (
    <main>
      <h1 className="mb-4 text-xl font-bold">Your Spaces</h1>
      <ul className="flex flex-col gap-3">
        {mockSpaces.map((space) => (
          <li key={space.id}>
            <Link
              href={`/spaces/${space.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-semibold">{space.code}</span>
              <span className="ml-2 text-zinc-500">{space.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
