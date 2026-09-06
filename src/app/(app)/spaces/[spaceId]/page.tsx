import { redirect, notFound } from "next/navigation";
import { classContext } from "@/lib/class-context";
import { classHref } from "@/lib/class-navigation";
export default async function SpacePage({params}: {params: Promise<{spaceId:string}>}) { const {spaceId} = await params; const {groups,selected} = await classContext(); const group = selected?.spaceId === spaceId ? selected : groups.find(group => group.spaceId === spaceId); if (!group) notFound(); redirect(classHref(group)); }
