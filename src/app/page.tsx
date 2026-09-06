import Link from "next/link";
import { redirect } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { getCurrentUser } from "@/lib/auth";
import "./landing.css";

export default async function Home() {
  if (await getCurrentUser()) redirect("/spaces");
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="landing-brand"><BrandMark size={30} alt="" /><span className="landing-wordmark">study<span>circle</span></span></span>
        <nav className="landing-nav" aria-label="Account"><Link href="/login">Log in</Link><Link href="/signup" className="landing-cta">Sign up</Link></nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-stage">
            {/* Illustrative examples of the real surfaces; decorative, so hidden from assistive tech. */}
            <div className="landing-floats" aria-hidden="true">
              <figure className="float float-meetup">
                <figcaption>Meetup</figcaption>
                <p className="float-title">Kennedy Library, 3rd floor</p>
                <p className="float-meta">Today at 3:00 PM &middot; 4 going</p>
              </figure>
              <figure className="float float-ai">
                <figcaption>Circle AI</figcaption>
                <p>What do our notes say about recursion?</p>
                <p className="float-answer">A function calling itself on a smaller problem. [1] Lecture notes.</p>
              </figure>
              <figure className="float float-chat">
                <figcaption>CSC 202 &middot; general</figcaption>
                <p className="float-msg"><b>Maya</b> anyone have notes from lecture 8?</p>
                <p className="float-msg"><b>Devin</b> just uploaded them</p>
              </figure>
              <figure className="float float-notes">
                <figcaption>Shared class files</figcaption>
                <p className="float-row">lecture-notes.pdf</p>
                <p className="float-row">whiteboard.jpg</p>
                <p className="float-row">recording.m4a</p>
              </figure>
            </div>
            <div className="landing-hero-copy">
              <h1><span>Every class already has a space.</span><span className="muted">Come find yours.</span></h1>
              <p className="landing-lede">Chat, meetups, and shared notes for every course you&rsquo;re in.</p>
              <div className="landing-actions"><Link href="/signup" className="landing-cta">Create your account</Link></div>
              <p className="landing-note">For students with a calpoly.edu email.</p>
              <p className="landing-preview-label">Illustrative preview &mdash; sample messages, files, AI answer, and meetup.</p>
            </div>
          </div>
        </section>
        <section className="landing-section" aria-labelledby="inside">
          <h2 className="landing-section-title" id="inside">What&rsquo;s inside</h2>
          <ul className="landing-grid">
            <li><h3>Spaces</h3><p>Find your course, then choose your professor&rsquo;s space.</p></li>
            <li><h3>Meetups</h3><p>A place and a time. Not another group chat.</p></li>
            <li><h3>Shared notes</h3><p>Share notes, photos, and voice memos with your class.</p></li>
            <li><h3>Circle AI</h3><p>Ask about shared class materials with linked sources. Copy practice cards into Quizlet.</p></li>
          </ul>
        </section>
        <section className="landing-section" aria-labelledby="how">
          <h2 className="landing-section-title" id="how">How it works</h2>
          <ol className="landing-steps">
            <li><p>Sign up with your Cal Poly email.</p></li>
            <li><p>Pick your courses and professors.</p></li>
            <li><p>Open a space and start studying together.</p></li>
          </ol>
        </section>
        <section className="landing-section landing-faq" aria-labelledby="faq">
          <h2 className="landing-section-title" id="faq">A few common questions</h2>
          <details><summary>Who can join StudyCircle?</summary><p>Sign up with a calpoly.edu email. StudyCircle currently serves Cal Poly students.</p></details>
          <details><summary>How do professor spaces work?</summary><p>Pick your courses and professors to find matching class spaces. These are shared student spaces; professor participation is not guaranteed.</p></details>
          <details><summary>What can I upload?</summary><p>Share PDFs, DOCX documents, text or Markdown notes, images, and audio such as voice memos. The general limit is 25 MB per file; text and Markdown are limited to 500 KB, and PDFs to 60 pages. Files are shared with your class; AI processing may take time.</p></details>
          <details><summary>What does Circle AI use?</summary><p>Circle AI uses processed materials shared in your class and links to sources for its answers and practice cards. Check those sources: AI can make mistakes, and answers depend on the available materials.</p></details>
          <details><summary>How do I export to Quizlet?</summary><p>Use Copy for Quizlet on a practice card set, then paste into Quizlet&rsquo;s import tool. Choose tabs between questions and answers and new lines between cards. This is a copy/paste export, not an automatic account sync.</p></details>
        </section>
        <section className="landing-close">
          <h2>Start with this term&rsquo;s classes.</h2>
          <Link href="/signup" className="landing-cta">Create your account</Link>
        </section>
      </main>
      <footer className="landing-footer"><span>StudyCircle</span><span>Made for Cal Poly</span></footer>
    </div>
  );
}
