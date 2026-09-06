import ClassMeetups from "@/features/class-meetups/ClassMeetups";
export default async function Page({params}: {params: Promise<{spaceId:string;subspaceId:string}>}) { return <ClassMeetups {...await params} />; }
