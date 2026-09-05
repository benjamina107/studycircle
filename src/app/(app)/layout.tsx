import BottomNav from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import "./workspace.css";

// Mobile-first app shell: content column + fixed bottom tab bar (spec §6.2).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="workspace">
      <header className="workspace-header"><Link href="/spaces" className="workspace-brand"><span aria-hidden="true">◎</span> studycircle</Link><span className="workspace-campus">Cal Poly</span></header>
      <div className="workspace-layout"><aside className="workspace-sidebar"><BottomNav /></aside><div className="workspace-content">{children}</div></div>
    </div>
  );
}
