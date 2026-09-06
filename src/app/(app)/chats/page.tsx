import { redirect } from "next/navigation";
import { classContext } from "@/lib/class-context";
import { classHref } from "@/lib/class-navigation";
export default async function ChatsPage() { const { selected } = await classContext(); redirect(selected ? classHref(selected, "chat") : "/spaces"); }
