import { connection } from "next/server";
import MeetupsDemo from "@/components/meetups/MeetupsDemo";
import { makeMeetupsDemo } from "@/lib/meetups-demo";

// The existing (app) layout still enforces authentication. This surface only
// presents fictional fixtures, never the signed-in user's identity or records.
export default async function MeetupsPage() {
  await connection();
  // eslint-disable-next-line react-hooks/purity -- Request-time Server Component: connection() intentionally keeps fixtures future-dated.
  const initialData = makeMeetupsDemo(Date.now());
  return <div className="rounded-3xl bg-stone-50 p-4 sm:p-6"><MeetupsDemo initialData={initialData} /></div>;
}
