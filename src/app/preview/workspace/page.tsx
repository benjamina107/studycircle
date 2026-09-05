import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ProfileForm from "@/components/ProfileForm";
import EnrollmentForm from "@/components/EnrollmentForm";
import MeetupFeed from "@/components/MeetupFeed";
import ChatsPage from "../chat/page";
import "../../(app)/workspace.css";

// Development-only layout review. No user data or authentication bypass.
export default async function WorkspacePreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view } = await searchParams;
  return <div className="workspace">
    <header className="workspace-header"><span className="workspace-brand">◎ studycircle</span><span className="workspace-campus">Layout preview</span></header>
    <div className="workspace-layout"><aside className="workspace-sidebar"><BottomNav /></aside><div className="workspace-content">
      <nav aria-label="Preview screens" className="mb-6 flex gap-4 text-sm"><Link href="?view=feed">Feed</Link><Link href="?view=chats">Chats</Link><Link href="?view=profile">Profile</Link></nav>
      {view === "profile" ? <main><header className="page-heading"><h1>Profile</h1><p>Manage your classes, professors, and personal details.</p></header><p className="workspace-notice">Sample profile. Editing is disabled in this preview.</p><fieldset disabled><EnrollmentForm sections={[]} enrolled={[{id:"sample-section",section_code:"01",courses:{code:"DEMO 101",title:"Example course",term:"Sample term"},professors:{name:"Professor Lumen (sample)"}}]} /><ProfileForm email="student@example.com" profile={{name:"Sample Student",major:"Computer Science",interests:"",avatar_url:null}} /></fieldset></main> : view === "chats" ? <ChatsPage searchParams={Promise.resolve({})} /> : <main><header className="page-heading"><h1>Feed</h1><p>Meetups from your classes and professors.</p></header><p className="workspace-notice">Fictional layout examples. RSVP is disabled here.</p><MeetupFeed preview userId="preview" joinedIds={[]} now={0} meetups={[
        { id:"example-a",title:"Review session: trees and graphs",blurb:"Bring a practice problem to work through together.",location_name:"Sample library room",starts_at:"2030-09-18T22:00:00Z",creator_id:"sample-host",subspaces:{professors:{name:"Professor Lumen (sample)"},spaces:{courses:{code:"DEMO 101",title:"Example course",term:"Sample term"}}}},
        { id:"example-b",title:"Linear algebra study group",blurb:"Reviewing this week’s exercises.",location_name:"Sample study lounge",starts_at:"2030-09-19T20:00:00Z",creator_id:"sample-host",subspaces:{professors:{name:"Professor Rowan (sample)"},spaces:{courses:{code:"DEMO 202",title:"Example course",term:"Sample term"}}}},
      ]} /></main>}
    </div></div>
  </div>;
}
