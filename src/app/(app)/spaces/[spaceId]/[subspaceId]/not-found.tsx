import Link from "next/link";
export default function NotFound() { return <main className="workspace-panel"><header className="page-heading"><h1>Class unavailable</h1><p>This class doesn’t exist or isn’t one of your enrolled course sections.</p></header><Link className="workspace-button" href="/spaces">Open your classes</Link></main>; }
