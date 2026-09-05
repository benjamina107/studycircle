import { redirect } from "next/navigation";

// Default surface for a subspace is Meetups (spec §6.3).
export default async function SubspacePage(
  props: PageProps<"/spaces/[spaceId]/[subspaceId]">
) {
  const { spaceId, subspaceId } = await props.params;
  redirect(`/spaces/${spaceId}/${subspaceId}/meetups`);
}
