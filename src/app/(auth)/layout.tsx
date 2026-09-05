import Link from "next/link";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link href="/login" className="auth-brand" aria-label="StudyCircle home"><span className="auth-mark" aria-hidden="true">◎</span>study<span>circle</span></Link>
        <span className="auth-campus"><span aria-hidden="true">●</span> Made for Cal Poly</span>
      </header>
      <main className="auth-main">
        <section className="auth-story" aria-label="A better way to study together">
          <p className="auth-eyebrow">STUDYCIRCLE / CAL POLY</p>
          <h1>A space for <br /><em>your classes.</em></h1>
          <p className="auth-story-copy">Connect with classmates, ask questions, and organize study sessions by course.</p>
          <div className="auth-orbit" aria-hidden="true"><div className="auth-orbit-ring" /><div className="auth-orbit-ring inner" /><span className="auth-orbit-center">sc.</span><span className="auth-orbit-label label-one">Course chats</span><span className="auth-orbit-label label-two">Study sessions</span><span className="auth-orbit-dot" /></div>
        </section>
        <section className="auth-panel" aria-label="Your StudyCircle account"><div className="auth-panel-content">{children}</div></section>
      </main>
      <footer className="auth-footer"><span>StudyCircle</span></footer>
    </div>
  );
}
