import {notFound} from 'next/navigation';
import {requireUser} from '@/lib/auth';
import {chatClasses} from '@/lib/chat-classes';
import Classmates from '@/components/classmates/Classmates';

// Per-user and auth-gated: never prerender, and skip static path collection.
export const dynamic = "force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{spaceId:string;subspaceId:string}>;searchParams:Promise<{dm?:string}>}){
 const user=await requireUser();const {spaceId,subspaceId}=await params;const groups=await chatClasses(user.id);
 if(!groups.some(g=>g.id===subspaceId&&g.space_id===spaceId))notFound();
 const openAI=(await searchParams).dm==='ai';
 return <Classmates key={subspaceId+String(openAI)} subspace={subspaceId} userId={user.id} openAI={openAI}/>;
}
