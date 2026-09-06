import { notFound } from "next/navigation";
import WorkspacePreview from "@/components/WorkspacePreview";
import "../../(app)/workspace.css";

export default async function WorkspacePreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view } = await searchParams;
  const tab = view === "chat" || view === "chats" ? "chat" : view === "files" ? "files" : "meetups";
  return <WorkspacePreview key={view || "meetups"} initialTab={tab} initialProfile={view === "profile"} />;
}
