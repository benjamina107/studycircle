# Study Spaces — Product Spec (v0.1)

**Source:** planning conversation, Sep 5 2026
**Status:** Draft. Captures where the conversation landed, not where it started. Superseded ideas are listed at the bottom so we don't relitigate them.

---

## 1. One-liner

A mobile-friendly web app for Cal Poly students where every class is a predefined **Space** with a group chat, in-person **Meetups**, shared lecture notes, and an AI that actually knows what the professor taught.

## 2. Problem

- Students don't know who else is in their class, especially across sections, and the quiet ones never speak up.
- Generic chatbots have no idea what *your* professor covered in lecture.
- Exam dates, meetup times, and shared notes get buried in group chats.

## 3. Goals / Non-goals

**Goals**
- Zero-friction discovery: you're in the class → you're in the Space. No creating or hunting for groups.
- Make it easy to meet up in person.
- Turn the class's collective notes + syllabus into summaries, Q&A, and exam prep.
- Simple, intuitive, works well on a phone.

**Non-goals (for this timeframe)**
- Native mobile app. Web only, responsive.
- User-created chat rooms / channels (see "Decided against").

## 4. Platform & constraints

- Responsive web app (mobile-first layout).
- Login restricted to `@calpoly.edu` with email verification.
- Course catalog (courses, sections, professors, days/times) prefetched from Cal Poly's site for the current term. **How** is unresolved — see Open Questions.

## 5. Core concepts

| Concept | What it is |
|---|---|
| **Space** | Top-level container for one course (e.g. CSC 202) for the current term. Predefined from the catalog — users can't create them. |
| **Subspace** | One per **professor** within a Space (not per section — sections of the same prof learn the same material; splitting further is too much separation). Most activity lives here. |
| **Channels** | Predefined chat channels inside a subspace, Discord-style. Users cannot create new ones. |
| **Meetup** | A lightweight posting: "I'll be at the library tomorrow at 3." Has a location (map pin) + time, optional blurb. It is *not* its own group chat. |
| **Lecture folder** | One folder per class session (auto-generated from the schedule). Anyone can upload notes to it. |
| **Class AI** | A bot scoped to the subspace with all uploaded notes + syllabus as context. |

## 6. Features

### 6.1 Onboarding & profile
- Sign up / log in with Cal Poly email → verification email.
- Select your classes (course + section/professor) from the prefetched catalog.
- Profile: name, major, interests, profile picture.
- Settings tab (see notifications).

### 6.2 Navigation
Three main areas: **Spaces**, **Chats**, **Profile/Settings**. (Original "feed" tab replaced by Spaces — see "Decided against".)

### 6.3 Space / Subspace view
- Banner at top for upcoming exams ("Exam 1 in 6 days") — driven by the syllabus (6.6).
- Left-side tab: **Meetups** — who's studying right now / next meetups for this class, plus a "create meetup" button.
- Chat channels (predefined).
- Lecture folders on a calendar-ish view keyed to the class's meeting days.

### 6.4 Meetups
- Create: location (map pin), time, short title/blurb.
- Displayed as simple cards (creator's picture, stack of avatars of people who've joined, Join button).
- Joining a meetup surfaces it in your Chats tab / pins location + time so nobody has to scroll for it.
- Creator can remove people from their meetup. (This is the surviving piece of the "owner can ban" idea.)
- Predefined per-user limits (e.g. rate limits on posting) to curb spam. Exact numbers TBD.

### 6.5 Chat
- Per-subspace predefined channels.
- A pinned location/time widget in any chat tied to a meetup.
- `@ClassAI` mention in chat → bot replies inline (like Meta AI in Instagram DMs). E.g. "@ClassAI what are we learning tomorrow?"

### 6.6 Notes & AI
- **Upload notes** into the lecture folder for that day (file sharing: notes, photos, PDFs).
- **Per-lecture summary**: AI extracts and summarizes "what this lecture covered." Retains memory across the term.
- **Ask questions** about a specific lecture or the class overall, with actual class context — the differentiator vs. a generic chatbot.
- **Syllabus / course schedule upload**: AI parses quiz/exam dates, whether each exam is cumulative, and topic coverage.
  - Schedule is editable (dates are tentative).
  - One schedule per professor per term, shared across that professor's sections — reuse rather than re-upload.
- **Exam prep**: ~1 week before an exam, generate a summary and practice test from the relevant lectures' notes. Banner in the subspace + email notification.

### 6.7 Notifications
- Email-based (no push, since no native app).
- Configurable per event: someone joins your meetup, new message/mention, exam reminders.
- **"Test notification" button** in settings that sends a confirmation email so users can verify it works.

## 7. UI direction

- Reference: **Discord structure + simple card feed**. Not Yik Yak.
- Priority is simplicity and intuitiveness on mobile.
- Meetups/postings rendered as individual cards.

## 8. Open questions

1. **Catalog prefetch** — is there an API or do we scrape Cal Poly's schedule site? Blocks everything downstream.
2. **Password-protected groups** — proposed for spam control, pushed back on as anti-community. Unresolved; deferred.
3. **Cross-professor chat** — should the top-level Space have its own chat spanning all professors? Leaning no ("professors teach different things"), parked.
4. **Course schedule scope** — syllabus is per section but we're organizing per professor. Assume same-prof-same-term is close enough; confirm.
5. **Moderation model** — with no user-created chats, who moderates channels? Meetup creators manage their own; channel moderation is undefined.
6. **Per-user limits** — what exactly is capped and at what numbers.
7. **Notes privacy / ownership** — who can see uploads, can uploader delete, what happens to AI summaries derived from them.

## 9. Decided against (don't reopen without new info)

- **User-created study circles + a global feed.** Replaced by predefined Spaces because with AI features tied to the class, duplicate circles for the same class would fragment notes. Feed became the Meetups tab.
- **Subspaces per section.** Too much separation; per professor instead.
- **User-created channels.** Too much friction ("who's gonna join?"). Predefined only.
- **Native mobile app.** Out of scope for the timeframe.
- **Postings as group chats.** A posting is a location + time, not a chat.

## 10. Suggested MVP cut

Ship first: auth + catalog + Spaces/Subspaces + one chat channel + meetups + notes upload. Then: per-lecture AI summaries and `@ClassAI`. Then: syllabus parsing, exam banners, practice tests, notification settings.