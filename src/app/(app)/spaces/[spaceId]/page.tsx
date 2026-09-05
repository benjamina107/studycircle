import Link from "next/link";
import { notFound } from "next/navigation";
import { mockSpaces } from "@/lib/mock-data";

// A Space's subspaces — one per professor, not per section (spec §5).
export default async function SpacePage(props: PageProps<"/spaces/[spaceId]">) {
  const { spaceId } = await props.params;
  const space = mockSpaces.find((s) => s.id === spaceId);
  if (!space) notFound();

  return (
    <main>
      <h1 className="mb-1 text-xl font-bold">{space.code}</h1>
      <p className="mb-4 text-zinc-500">{space.title}</p>
      <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
        Professors
      </h2>
      <ul className="flex flex-col gap-3">
        {space.subspaces.map((sub) => (
          <li key={sub.id}>
            <Link
              href={`/spaces/${space.id}/${sub.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {sub.professorName}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
