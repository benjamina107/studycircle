"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function ChatSubnav({ base }: { base: string }) {
  const path = usePathname();
  if (path.endsWith("/chat")) return null;
  return <><Link href="/spaces" className="workspace-back">← Feed</Link><nav className="my-4 flex gap-2" aria-label="Class pages">{["chat", "meetups", "lectures"].map(tab => <Link key={tab} href={`${base}/${tab}`} className="workspace-secondary">{tab[0].toUpperCase() + tab.slice(1)}</Link>)}</nav></>;
}
