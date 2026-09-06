import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { chatClasses } from "@/lib/chat-classes";
import ClassWorkspace from "@/components/study/ClassWorkspace";

// Per-user and auth-gated: never prerender, and skip static path collection.
export const dynamic = "force-dynamic";
export default async function ChatPage({ params }: { params: Promise<{spaceId:string;subspaceId:string}> }) {
  const user = await requireUser();
  const { spaceId, subspaceId } = await params;
  const classes = await chatClasses(user.id);
  const group = classes.find(item => item.id === subspaceId && item.space_id === spaceId);
  if (!group) notFound();
  return <main><ClassWorkspace key={subspaceId} subspace={subspaceId} userId={user.id} classLabel={group.spaces.courses.code + " · " + group.professors.name} /></main>;
}
