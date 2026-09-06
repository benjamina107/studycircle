import ClassHeader from "@/components/ClassHeader";
import { classContext } from "@/lib/class-context";
import { requireUser } from "@/lib/auth";
import "./workspace.css";

// One enrolled course/professor workspace at a time.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const context = await classContext().catch(() => null);
  return <div className="workspace"><ClassHeader groups={context?.groups || []} selectedId={context?.selected?.id} loadFailed={!context} /><div id="workspace-main" className="group-content">{children}</div></div>;
}
