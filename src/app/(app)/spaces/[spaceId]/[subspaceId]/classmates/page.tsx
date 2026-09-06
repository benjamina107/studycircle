import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/auth';
import {chatClasses} from '@/lib/chat-classes';
import Classmates from '@/components/classmates/Classmates';
export default async function Page({params}:{params:Promise<{spaceId:string;subspaceId:string}>}){
 const user=await requireUser();const {spaceId,subspaceId}=await params;const groups=await chatClasses(user.id);
 if(!groups.some(g=>g.id===subspaceId&&g.space_id===spaceId))notFound();
 return <Classmates key={subspaceId} subspace={subspaceId} userId={user.id} aiHref={`/spaces/${encodeURIComponent(spaceId)}/${encodeURIComponent(subspaceId)}/chat?channel=ai`}/>;
}
