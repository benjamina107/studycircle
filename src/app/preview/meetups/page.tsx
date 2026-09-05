import { connection } from "next/server";
import MeetupsDemo from "@/components/meetups/MeetupsDemo";
import { makeMeetupsDemo } from "@/lib/meetups-demo";

export const metadata = { title: "Fictional meetups preview · StudyCircle", robots: { index: false, follow: false } };

export default async function MeetupsPreviewPage() {
  await connection();
  // eslint-disable-next-line react-hooks/purity -- Request-time Server Component: connection() intentionally keeps fixtures future-dated.
  const initialData = makeMeetupsDemo(Date.now());
  return <main className="min-h-screen bg-stone-50 px-4 py-6 sm:px-8 sm:py-10"><div className="mx-auto max-w-5xl"><MeetupsDemo initialData={initialData} /></div></main>;
}
