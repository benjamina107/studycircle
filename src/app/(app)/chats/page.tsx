import ChatsOverview from "@/features/chat/ChatsOverview";

export default async function ChatsPage(props: { searchParams: Promise<{ demo?: string | string[] }> }) {
  const search = await props.searchParams;
  const demo = (Array.isArray(search.demo) ? search.demo[0] : search.demo) === "1";
  return <main><ChatsOverview demo={demo} /></main>;
}
