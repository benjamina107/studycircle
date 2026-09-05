import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { chatClasses } from "@/lib/chat-classes";
import { createClient } from "@/lib/supabase/server";
import { meetupTime } from "@/lib/feed";
import ChatDemo from "@/components/chat/ChatDemo";
import { resolveChatChannel } from "@/lib/chat-demo";
export default async function ChatPage({ params, searchParams }: { params: Promise<{spaceId:string;subspaceId:string}>; searchParams: Promise<{channel?:string|string[]}> }) {
  const user = await requireUser();
  const { spaceId, subspaceId } = await params;
  const channel = resolveChatChannel((await searchParams).channel);
  const classes = await chatClasses(user.id);
  const group = classes.find(item => item.id === subspaceId && item.space_id === spaceId);
  if (!group) notFound();
  const db = await createClient();
  const meetups = await db.from("meetups").select("id,title,location_name,starts_at,creator_id").eq("subspace_id",subspaceId).order("starts_at",{ascending:false}).limit(100);
  const ids = (meetups.data || []).map(item => item.id);
  const attendance = ids.length ? await db.from("meetup_attendees").select("meetup_id").eq("user_id",user.id).in("meetup_id",ids) : {data:[],error:null};
  if(meetups.error || attendance.error) return <p role="alert">This class chat couldn’t be loaded. Please refresh and try again.</p>;
  // eslint-disable-next-line react-hooks/purity -- Authenticated request-time Server Component.
  const now = Date.now();
  return <main><ChatDemo key={subspaceId + channel} preview={false} initialChannel={channel} classLabel={group.spaces.courses.code + " · " + group.professors.name} invites={(meetups.data || []).map(item => ({id:item.id,title:item.title,when:meetupTime(item.starts_at),location:item.location_name,hosting:item.creator_id === user.id,started:Date.parse(item.starts_at) <= now,joined:!!attendance.data?.some(row => row.meetup_id === item.id)}))} /></main>;
}
