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
      <Link href="/spaces" className="workspace-back">← Spaces</Link>
      <header className="page-heading"><h1>{space.code}</h1><p>{space.title}</p></header>
      <p className="workspace-notice">Sample course. Select a professor group to explore the available previews.</p>
      <h2 className="workspace-section-title">
        Professors
      </h2>
      <ul className="course-grid">
        {space.subspaces.map((sub) => (
          <li key={sub.id}>
            <Link
              href={`/spaces/${space.id}/${sub.id}`}
              className="course-card"
            >
              {sub.professorName}
              <span className="course-card-footer">Open group →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
