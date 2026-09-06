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
                <figcaption>Class AI</figcaption>
                <p>What&rsquo;s covered on the midterm?</p>
                <p className="float-answer">Lectures 5&ndash;9 &mdash; recursion, trees, and Big-O.</p>
              </figure>
              <figure className="float float-chat">
                <figcaption>CSC 202 &middot; general</figcaption>
                <p className="float-msg"><b>Maya</b> anyone have notes from lecture 8?</p>
                <p className="float-msg"><b>Devin</b> just uploaded them</p>
              </figure>
              <figure className="float float-notes">
                <figcaption>Week 4 &middot; Lecture 8</figcaption>
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
            </div>
          </div>
        </section>
        <section className="landing-section" aria-labelledby="inside">
          <h2 className="landing-section-title" id="inside">What&rsquo;s inside</h2>
          <ul className="landing-grid">
            <li><h3>Spaces</h3><p>One per course, one per professor. You&rsquo;re enrolled, so you&rsquo;re in.</p></li>
            <li><h3>Meetups</h3><p>A place and a time. Not another group chat.</p></li>
            <li><h3>Lecture notes</h3><p>One folder per session, filled in by the whole class.</p></li>
            <li><h3>Class AI</h3><p>Answers from your class&rsquo;s notes and syllabus. Exports to Quizlet.</p></li>
          </ul>
        </section>
        <section className="landing-section" aria-labelledby="how">
          <h2 className="landing-section-title" id="how">How it works</h2>
          <ol className="landing-steps">
            <li><p>Sign up with your Cal Poly email.</p></li>
            <li><p>Pick your courses and professors.</p></li>
            <li><p>Open a space. Everyone&rsquo;s already there.</p></li>
          </ol>
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
