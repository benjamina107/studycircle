# StudyCircle

A mobile-friendly web app for Cal Poly students where every class is a predefined **Space** with group chat, in-person **meetups**, shared lecture notes, and an AI that actually knows what the professor taught.

Full product spec: [docs/productspec.md](docs/productspec.md)

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4**
- **Prisma 7** + SQLite for local dev (via `better-sqlite3` driver adapter); swap the datasource for Postgres in production
- AI + email layers are stubbed in `src/lib/` until their open questions are settled

## Getting started

```bash
npm install            # runs prisma generate via postinstall
cp .env.example .env
npm run db:push        # create/update dev.db from prisma/schema.prisma
npm run dev
```

Open http://localhost:3000 — you'll land on `/spaces` (auth isn't wired up yet).

## Layout

```
docs/productspec.md         product spec (source of truth)
prisma/schema.prisma        domain model: User, Course/Section/Professor,
                            Space → Subspace → Channel, Meetup, LectureFolder,
                            Note, schedules, notification settings
src/lib/
  db.ts                     Prisma client (v7 driver-adapter style)
  catalog.ts                Cal Poly catalog prefetch — open question #1, stub
  classai.ts                lecture summaries, Q&A, syllabus parsing — stubs
  email.ts                  verification + notification emails — stubs
  mock-data.ts              placeholder data until pages query the DB
src/app/
  (auth)/                   login, signup, verify (placeholder forms)
  (app)/spaces/             Spaces → Subspace (per professor) → chat / meetups / lectures
  (app)/chats/              joined meetups + channels
  (app)/profile, settings/  profile + email-notification settings
  api/notifications/test/   "send test notification" endpoint (501 stub)
```

## Roadmap (spec §10)

1. **Now (scaffolded):** auth, catalog, Spaces/Subspaces, one chat channel, meetups, notes upload
2. **Next:** per-lecture AI summaries, `@ClassAI` in chat
3. **Then:** syllabus parsing, exam banners, practice tests, notification settings

Key blocker: how the course catalog gets prefetched (API vs. scrape) — spec §8, open question #1.
