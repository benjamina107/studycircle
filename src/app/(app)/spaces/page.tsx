import Link from "next/link";
import { redirect } from "next/navigation";
import { classContext } from "@/lib/class-context";
import { classHref } from "@/lib/class-navigation";
export default async function SpacesPage() {
  const { selected } = await classContext();
  if (selected) redirect(classHref(selected));
  return <main><header className="page-heading"><h1>Your classes</h1><p>Select your course sections in Profile to open their meetups, chat, and files.</p></header><Link className="workspace-button" href="/profile#classes">Choose classes in Profile</Link></main>;
}
