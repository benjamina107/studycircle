# StudyCircle

A mobile-friendly web app for Cal Poly students: course spaces, professor subspaces,
chat, study meetups, lecture notes, AI summaries and notification preferences.

## Stack and setup

Next.js 16 (App Router, TypeScript), React 19, Tailwind 4, and Supabase Auth/Postgres.
Copy `.env.example` to `.env.local` and set the shared project's URL and publishable
key from its Connect dialog. Never expose secret/service-role credentials.

```sh
npm install
npm run dev
```

The shared development database already has both versioned migrations applied.
For another project, follow [team setup](docs/supabase-setup.md). Do not reset the
shared database or rerun its applied initial migration.

## Database and validation

There are 17 application tables plus Supabase-managed Auth tables. See
[database inventory](docs/database-migration.md) for every model/field mapping and
[profile integration](docs/supabase-profile-handoff.md) for the auth contract.

```sh
npm test
npm run check:supabase
npm run lint
npm run build
```

Migrations live in `supabase/migrations/`. Browser/server Supabase clients live in
`src/lib/supabase/`; `src/proxy.ts` refreshes cookies. The public-key connection check
verifies all tables reject anonymous access. Database tests cover ownership,
verification, foreign keys, uniqueness and isolation by course and professor.

## Implementation status

The database schema is provisioned. Local auth and profile integration is implemented;
real email verification remains to be tested. Catalog validation is available offline.
Meetup and chat previews use sample data at `/preview/meetups` and `/preview/chat`;
their persistence, catalog import and Storage uploads remain separate work.
Custom SMTP and a real Cal Poly email-verification test remain pending. See
[product specification](docs/productspec.md) and the repository issues.

Offline checks: `npm run test:auth`, `npm run test:catalog`, and
`npm run catalog:validate -- docs/catalog-demo.json`. See
[meetup preview](docs/meetups-preview.md), [chat preview](docs/chat-preview.md),
and [catalog format](docs/catalog-format.md).

## Shared notes and ClassAI

Authenticated class chat now saves messages and supports `@AI` / `@ClassAI`. Use Shared notes to upload audio, images, PDF, DOCX, or text with optional context. Start `npm run worker` alongside `npm run dev` for extraction and AI responses. Quizlet cards are generated on request and copied as tab-separated question/answer text. See [AI setup, limits, and verification](docs/ai-knowledge-base.md). Public preview routes still use fictional data.
