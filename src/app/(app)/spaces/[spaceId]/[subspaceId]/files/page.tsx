import ClassFiles from "@/features/files/ClassFiles";
export default async function Page({params}: {params: Promise<{subspaceId:string}>}) { const {subspaceId} = await params; return <ClassFiles key={subspaceId} subspaceId={subspaceId} />; }
