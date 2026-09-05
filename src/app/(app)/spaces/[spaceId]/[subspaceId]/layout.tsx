import Link from "next/link";
import ExamBanner from "@/components/ExamBanner";
import { mockExam } from "@/lib/mock-data";

// Subspace shell — exam banner on top (spec §6.3), tabs for the three
// activity surfaces. Most activity in the app lives here.
export default async function SubspaceLayout(
  props: LayoutProps<"/spaces/[spaceId]/[subspaceId]">
) {
  const { spaceId, subspaceId } = await props.params;
  const base = `/spaces/${spaceId}/${subspaceId}`;

  return (
    <div>
      <ExamBanner title={mockExam.title} daysAway={mockExam.daysAway} />
      <nav className="my-4 flex gap-2">
        {[
          { href: `${base}/chat`, label: "Chat" },
          { href: `${base}/meetups`, label: "Meetups" },
          { href: `${base}/lectures`, label: "Lectures" },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {props.children}
    </div>
  );
}
