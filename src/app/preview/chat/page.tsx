import { notFound } from "next/navigation";
import WorkspacePreview from "@/components/WorkspacePreview";
import "../../(app)/workspace.css";

export default async function ChatPreviewPage({ searchParams }: { searchParams: Promise<{ channel?: string; class?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  return <WorkspacePreview initialTab="chat" initialGroup={query.class === "demo202" ? "math" : "cs"}
    initialChannel={query.channel === "homework" ? "homework" : "general"} />;
}
