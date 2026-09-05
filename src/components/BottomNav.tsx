"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Three main areas — spec §6.2: Spaces, Chats, Profile/Settings.
const tabs = [
  { href: "/spaces", label: "Feed", icon: "M4 4h16v6H4z M4 14h16v6H4z" },
  { href: "/chats", label: "Chats", icon: "M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 1 1 18-4Z" },
  { href: "/profile", label: "Profile", icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      <div>
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href) || (tab.href === "/profile" && pathname === "/settings");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="workspace-nav-link"
              aria-current={active ? "page" : undefined}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
