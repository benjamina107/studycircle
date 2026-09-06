# StudyCircle

A mobile-friendly Cal Poly app with verified campus accounts, course/professor spaces, persistent meetups and chat, private shared Files, and ClassAI answers and Quizlet exports grounded in uploaded notes.

## Run locally

Next.js 16 App Router, TypeScript, React 19, Tailwind 4, and Supabase Auth/Postgres/Storage. Copy `.env.example` to `.env.local` and follow [team setup](docs/supabase-setup.md).

```sh
npm install
npm run dev
# Separate terminal for extraction and AI jobs:
npm run worker
```

Active Files uses `kb_uploads`/`kb_assets`, private `class-notes` Storage, and the knowledge worker. Old Lectures URLs redirect to Files; issue #17 supersedes required lecture folders. Separate `class_files` APIs and legacy lecture code remain but are not the active Files view. See [issue #6 reconciliation](docs/issue-6-reconciliation.md) and [AI setup and limits](docs/ai-knowledge-base.md). Public previews use fictional data.

## Database and deployment

There are **14 versioned SQL files (001–014)** in `supabase/migrations/`. Version 004 is a historical marker with no executable SQL. Compare hosted history and apply only missing reviewed versions; do not reset the shared database. Repository presence does not prove hosted application. The [database inventory](docs/database-migration.md) describes the original 17-table baseline, not the full current schema.

Production needs a server-capable Next.js deployment (`npm run build`, then `npm start` for Node hosting) and a supervised persistent `npm run worker` process. Next.js alone does not drain AI jobs. Configure canonical HTTPS `APP_URL`, Auth redirects/SMTP, private Storage, server-only Supabase secret/service-role and OpenAI keys, ffprobe on web/worker hosts, and upload size/time allowances. Never expose secrets through `NEXT_PUBLIC_` variables or commit them. See [deployment checks](docs/supabase-setup.md).

## Validation

```sh
npm test
npm run test:auth
npm run test:knowledge
npm run lint
npm run build
```

`npm run check:supabase` checks hosted Auth settings and anonymous denial for the original 17-table contract; it does not verify all later migrations, Storage, or worker processing. Local tests and previews do not establish hosted readiness. See [email verification](docs/resend-email-setup.md), [catalog format](docs/catalog-format.md), and [remaining Files checks](docs/issue-6-reconciliation.md#hosted-acceptance-checks-still-required).
