import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { chatClasses, type ChatClass } from "@/lib/chat-classes";
export default async function ChatsPage() {
  const user = await requireUser();
  let classes: ChatClass[] = [];
  let failed = false;
  try { classes = await chatClasses(user.id); } catch { failed = true; }
  return <main><header className="page-heading"><h1>Chats</h1><p>Select a class to open its channels.</p></header>
    {failed ? <p role="alert">Your classes couldn’t be loaded. Please refresh and try again.</p> : classes.length ? <ul className="course-grid">{classes.map(group => <li key={group.id}><Link className="course-card" href={`/spaces/${group.space_id}/${group.id}/chat`}><span className="course-code">{group.spaces.courses.code}</span><h2>{group.spaces.courses.title}</h2><span className="workspace-hint">{group.professors.name} · {group.spaces.courses.term}</span><span className="course-card-footer">General · Homework · Meetups <span>→</span></span></Link></li>)}</ul> : <section className="workspace-panel"><h2 className="workspace-section-title">No class chats yet</h2><p className="workspace-hint">Select your classes in Profile. Chats will appear when their course groups are available.</p><Link className="workspace-back mt-5" href="/profile#classes">Manage classes</Link></section>}
  </main>;
}
