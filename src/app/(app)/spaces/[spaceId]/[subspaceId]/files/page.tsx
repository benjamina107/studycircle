import { Notes } from "@/components/study/ClassWorkspace";
import { requireUser } from "@/lib/auth";
export default async function Page({params}: {params: Promise<{subspaceId:string}>}) {
 const {subspaceId} = await params;
 const user = await requireUser();
 return <Notes key={subspaceId} subspace={subspaceId} userId={user.id}/>;
}
