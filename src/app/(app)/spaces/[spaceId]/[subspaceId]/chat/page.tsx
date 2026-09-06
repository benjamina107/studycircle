import ClassChat from "@/features/class-chat/ClassChat";
export default async function Page({params}: {params: Promise<{subspaceId:string}>}) { const {subspaceId} = await params; return <ClassChat key={subspaceId} subspaceId={subspaceId} />; }
