import { classContext } from "@/lib/class-context";
import { notFound } from "next/navigation";
export default async function SubspaceLayout(props: LayoutProps<"/spaces/[spaceId]/[subspaceId]">) {
  const { spaceId, subspaceId } = await props.params;
  const { groups } = await classContext();
  if (!groups.some(group => group.id === subspaceId && group.spaceId === spaceId)) notFound();
  return <>{props.children}</>;
}
