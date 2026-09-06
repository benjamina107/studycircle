import { redirect } from "next/navigation";
export default async function Page({params}: {params: Promise<{spaceId:string;subspaceId:string}>}) { const {spaceId,subspaceId} = await params; redirect(`/spaces/${encodeURIComponent(spaceId)}/${encodeURIComponent(subspaceId)}/files`); }
