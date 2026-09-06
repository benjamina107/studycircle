import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link href="/login" className="auth-brand" aria-label="StudyCircle home"><BrandMark size={30} alt="" /><span className="auth-wordmark">study<span>circle</span></span></Link>
      </header>
      <main className="auth-main">
        <section className="auth-panel" aria-label="Your StudyCircle account">{children}</section>
      </main>
      <footer className="auth-footer"><span>StudyCircle</span><span>Made for Cal Poly</span></footer>
    </div>
  );
}
