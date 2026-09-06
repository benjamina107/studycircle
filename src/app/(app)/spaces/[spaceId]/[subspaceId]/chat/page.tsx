import { notFound,redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { chatClasses } from "@/lib/chat-classes";
import ClassWorkspace from "@/components/study/ClassWorkspace";
import { resolveChatChannel } from "@/lib/chat-demo";
export default async function ChatPage({ params, searchParams }: { params: Promise<{spaceId:string;subspaceId:string}>; searchParams: Promise<{channel?:string|string[]}> }) {
  const user = await requireUser();
  const { spaceId, subspaceId } = await params;
  const requested=(await searchParams).channel;
  const channel = requested==='ai'?'ai':resolveChatChannel(requested);
  const classes = await chatClasses(user.id);
  const group = classes.find(item => item.id === subspaceId && item.space_id === spaceId);
  if (!group) notFound();
  if(requested==='ai')redirect(`/spaces/${encodeURIComponent(spaceId)}/${encodeURIComponent(subspaceId)}/classmates?dm=ai`);
  return <main><ClassWorkspace key={subspaceId + channel} subspace={subspaceId} userId={user.id} initialChannel={channel} classLabel={group.spaces.courses.code + " · " + group.professors.name} /></main>;
}
