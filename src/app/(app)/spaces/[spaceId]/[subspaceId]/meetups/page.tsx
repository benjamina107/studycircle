import ClassMeetups from "@/features/class-meetups/ClassMeetups";

// Per-user and auth-gated: never prerender, and skip static path collection.
export const dynamic = "force-dynamic";
export default async function Page({params}: {params: Promise<{spaceId:string;subspaceId:string}>}) { return <ClassMeetups {...await params} />; }
