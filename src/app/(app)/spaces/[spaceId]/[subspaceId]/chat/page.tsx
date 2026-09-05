import ChatRoom from "@/features/chat/ChatRoom";

export default async function ChatPage(props: { params: Promise<{ spaceId: string; subspaceId: string }>; searchParams: Promise<{ channel?: string | string[]; demo?: string | string[] }> }) {
  const { spaceId, subspaceId } = await props.params;
  const search = await props.searchParams;
  const channel = Array.isArray(search.channel) ? search.channel[0] : search.channel;
  const demo = (Array.isArray(search.demo) ? search.demo[0] : search.demo) === "1";
  return <main><ChatRoom spaceId={spaceId} subspaceId={subspaceId} initialChannelId={channel} demo={demo} /></main>;
}
