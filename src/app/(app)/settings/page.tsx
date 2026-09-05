import Link from "next/link";

export default function SettingsPage() {
  return <main>
    <Link href="/profile" className="workspace-back">← Profile</Link>
    <header className="page-heading"><h1>Notifications</h1><p>Email notification preferences.</p></header>
    <section className="workspace-panel"><h2 className="workspace-section-title">Not available yet</h2><p className="workspace-hint">Notification preferences and test emails aren’t available yet. No settings need to be changed here.</p></section>
  </main>;
}
