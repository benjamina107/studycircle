import ChatSubnav from "@/components/chat/ChatSubnav";
export default async function SubspaceLayout(props: LayoutProps<"/spaces/[spaceId]/[subspaceId]">) {
  const { spaceId, subspaceId } = await props.params;
  return <div><ChatSubnav base={`/spaces/${spaceId}/${subspaceId}`} />{props.children}</div>;
}
