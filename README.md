# StudyCircle

StudyCircle is a mobile-friendly web app for Cal Poly students. Verified campus accounts join course/professor groups to organize meetups, chat, message classmates, and share notes. ClassAI uses those notes to answer questions with sources and generate cards for Quizlet import.

## Tech stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| App | Next.js 16.3.4 App Router, React 19.2.8, TypeScript 5 | Server-rendered pages, interactive client components, API routes, and Server Actions in one app |
| Styling | Tailwind CSS 4, global CSS, CSS Modules | Responsive layouts and component styles |
| Runtime | Node.js 22.22.2 (`.nvmrc`), npm, `tsx` | Runs Next.js, TypeScript scripts, and the background worker |
| Backend | Supabase Auth, Postgres, Storage | Accounts, relational data, access policies, and private uploaded files |
| AI | OpenAI SDK, Postgres `pgvector` | Source extraction, embeddings, retrieval, and grounded answers |
| Email | Supabase Auth email + Resend | Verification through configured SMTP; Resend HTTP API for notification testing |
| Quality | ESLint 9, TypeScript, Node test runner, PGlite | Linting, type checks, unit tests, and local SQL tests |

Other runtime libraries are `@supabase/ssr` for cookie-based sessions, `@supabase/supabase-js` for database/storage calls, `file-type` for file-signature detection, `pdf-lib` for PDF inspection and page splitting, `mammoth` for DOCX text, `yauzl` for DOCX archive checks, and `sharp` for image processing. Audio validation requires the system executable `ffprobe`.

## Architecture and data

```text
Browser
  └─ Next.js pages + React client components
       ├─ API routes / Server Actions → Supabase Auth + Postgres
       └─ Authorized file operations → private Supabase Storage

Postgres job queue
  └─ Separate Node worker → Storage + OpenAI → passages / AI replies
       └─ Browser polls APIs for messages and processing status
```

Server Components load the authenticated user and class context. Client components manage interactive forms, selected channels, messages, uploads, and previews with React hooks. API routes handle client requests; Server Actions handle operations such as profile edits, enrollment, and meetups. The active workspace uses HTTP polling for new messages and upload status.

The core data hierarchy is **course → professor/term subspace → enrolled sections**. A student's section enrollments determine access to the corresponding class group. Postgres also stores profiles, meetups and attendance, chat messages, direct messages, and notification preferences.

The active notes system separates each student's contribution (`kb_uploads`) from its deduplicated processing asset (`kb_assets`). Indexed passages and embeddings support retrieval. Shared class chat and private AI conversations use `study_messages`; human direct messages use `class_direct_messages`.

Supabase Row Level Security (RLS) and server-side authorization enforce class membership and private-message visibility. The browser uses a publishable key; privileged operations and worker jobs use a server-only secret/service-role key. Mutations validate inputs and origin where applicable, with database-backed quotas for messages, uploads, and AI requests. File downloads recheck access before issuing expiring signed URLs.

## Main user flows

1. **Sign up and verify.** A student registers with an `@calpoly.edu` address, verifies through Supabase Auth email, and signs in with a cookie-based session. Protected pages require a verified account.
2. **Complete onboarding and enroll.** The student completes their profile and selects existing course sections from the catalog. Students do not create catalog entries. An account-specific HTTP-only cookie remembers the last selected class on that browser.
3. **Open a class.** `/spaces` opens the remembered accessible class, or an enrolled fallback. `/chats` opens its chat. The class header switches between Meetups, Chat, Classmates, and Files; switching classes preserves the current tab. Students without enrollments go to Profile.
4. **Organize study sessions.** Members create and edit meetups, RSVP or leave, and view attendee information subject to privacy rules. Meetup lifecycle changes are implemented through Server Actions and database functions.
5. **Chat and connect.** Shared channels include General, Homework, Exam prep, Projects, Resources, and Off topic. Classmates provides one-to-one messages and a private Circle AI conversation. Mentioning `@Circle AI`, `@AI`, or `@ClassAI` in shared chat queues a class-visible AI response; messages in private AI chat queue a private response.
6. **Share and study files.** Students upload notes in Files, preview or download authorized originals, and track processing. Uploaders can remove their contributions or retry failed processing. AI answers include source references; generated question/answer cards can be copied as tab-separated text for manual Quizlet import. There is no Quizlet API integration or internal quiz player.

## ClassAI processing flow

1. The upload API checks membership, quotas, request size, file signatures, and format limits, then stores originals in the private `class-notes` bucket.
2. SHA-256 deduplication shares extraction work within a class while preserving separate contributions and ownership.
3. The worker claims durable jobs and extracts text: plain text and DOCX locally, PDF pages and images through OpenAI vision, and audio through transcription.
4. Extracted passages retain page, paragraph, or timestamp references. OpenAI embeddings are stored in Postgres with `pgvector`.
5. For an AI question, the worker retrieves relevant passages using semantic and lexical ranking, includes recent conversation context, and requests structured output. It validates the returned sources and saves the answer/cards for the UI to fetch.
6. Jobs use leases, retries, and backoff so worker restarts can recover unfinished work. Upload processing and answer processing run independently. Removing a final contribution removes its indexed passages and queues original-file cleanup; historical chat answers remain.

OpenAI integrations are the **Responses API** for extraction and answers (default `gpt-5.4-mini`, configurable), **Embeddings API** (`text-embedding-3-small`, 1,536 dimensions), and **Audio Transcriptions API** (`whisper-1`). Uploaded content is treated as untrusted reference material. Answers are probabilistic; citations let students check the original sources.

Supported inputs are PDF, images, plain text, DOCX, and audio. Main limits are 1–5 files per submission, 25 MB per file, a 30 MB request ceiling, 60 PDF pages, and one hour of audio. DOCX embedded images require separate uploads. Video, slides, spreadsheets, scheduled summaries, and automatic Quizlet publication are outside the current implementation. See [AI setup and limits](docs/ai-knowledge-base.md).

AI reply bodies render Markdown (including tables, lists, and code) with `react-markdown` and `remark-gfm`. `remark-math`, `rehype-katex`, and KaTeX render inline `$…$` / `\(…\)` and display `$$…$$` / `\[…\]` equations. Code stays literal; raw HTML and remote images are disabled. Human messages and Quizlet exports remain plain text. Run `npm run test:markdown` for rendering tests, or open `/preview/markdown` in development for a visual check. Restart the worker after deploying changes to its formatting instructions.

## API surface

Paths below are relative to the app. Class-scoped study and classmates requests use a `class` query parameter containing the subspace ID.

| Endpoint | Methods | Responsibility |
| --- | --- | --- |
| `/api/auth/{signup,login,logout,resend,verify,callback}` | Varies by operation | Supabase account creation, sessions, and verification |
| `/api/study/messages` | GET, POST, PATCH | Read/send shared or private AI messages; retry failed AI requests |
| `/api/study/uploads` | GET, POST | List contributions and upload notes for indexing |
| `/api/study/uploads/[id]` | GET, POST, DELETE | Preview/download, retry processing, or remove an owned contribution |
| `/api/classmates` | GET, POST, PATCH | Class roster, paginated direct messages, sending, and read receipts |
| `/api/notifications/test` | POST | Send the signed-in user a test email through Resend |
| `/api/chat/overview`, `/api/chat/messages` | GET; GET/POST | Separate chat implementation retained in the repository |
| `/api/class-files`, `/api/class-files/[id]/download` | GET/POST; GET | Separate file/attachment implementation retained in the repository |

**The active Chat and Files pages use `/api/study/*`.** The separate `class_files` APIs/components and legacy lecture code are not the active Files view. Old class Lectures URLs redirect to Files. Notification preferences and a test email endpoint exist, but automatic event notification dispatch is not wired up. Supabase handles verification emails; it does not use the placeholder verification helper in `src/lib/email.ts`.

## Code map

| Location | Contents |
| --- | --- |
| `src/app/` | Landing/auth pages, protected workspace routes, API handlers, and Server Actions |
| `src/components/study/ClassWorkspace.tsx` | Active class chat, private AI, and indexed Files UI |
| `src/components/classmates/` | Class roster and direct-message UI |
| `src/features/class-meetups/` | Meetup UI, validation/access, and actions |
| `src/lib/knowledge/` | Upload validation, extraction, retrieval, OpenAI integration, and worker logic |
| `src/lib/supabase/`, `src/lib/auth.ts`, `src/proxy.ts` | Supabase clients, authentication, and session refresh |
| `scripts/` | Worker entry point, environment/hosted checks, and catalog validation |
| `supabase/migrations/` | Versioned SQL schema, functions, and access policies |
| `tests/`, colocated `*.test.*` files | SQL, feature, and validation tests |
| `docs/` | Detailed setup, feature contracts, and verification notes |

## Run locally

```sh
nvm use
npm ci
cp .env.example .env.local
# Fill in .env.local, then:
npm run dev
```

Run the AI worker in a separate terminal:

```sh
npm run worker
```

| Environment variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |
| `APP_URL` | Canonical app origin; localhost for development, HTTPS in production |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server/worker privileged Supabase access |
| `OPENAI_API_KEY` | Server/worker OpenAI access |
| `OPENAI_RESPONSE_MODEL` | Optional extraction/answer model override |
| `FFPROBE_PATH` | Optional executable path; defaults to `ffprobe` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional notification test configuration with a verified sender |

Configure verification SMTP and Auth redirects in Supabase separately. `SMTP_URL` appears in the example environment file but is not used by the current mail implementation. Never put privileged keys in `NEXT_PUBLIC_` variables or commit secrets. Follow [team setup](docs/supabase-setup.md) and [email setup](docs/resend-email-setup.md).

## Database, deployment, and validation

The repository currently contains **18 SQL migration files**: `202609050001`–`202609050016` and `202609060001`–`202609060002`. Version `202609050004` is a historical marker without executable SQL. Compare hosted migration history and apply only missing reviewed versions; do not reset the shared database. The [database inventory](docs/database-migration.md) describes the original 17-table baseline, not the complete current schema.

Production requires a server-capable Next.js deployment (`npm run build`, then `npm start` for Node hosting) plus a supervised persistent `npm run worker` process. Next.js alone does not drain AI jobs. Configure private Storage, Auth redirects/SMTP, server secrets, `ffprobe` on web and worker hosts, and suitable upload size/time allowances.

```sh
npm test
npm run test:auth
npm run test:knowledge
npm run typecheck
npm run lint
npm run build
```

Additional scripts cover feed, catalog, profiles, and email notifications. `npm run check:supabase` checks hosted Auth configuration and anonymous denial for the original 17-table contract; it does not validate all later migrations, Storage, or worker processing. Local tests and fictional preview pages do not establish hosted readiness. See [remaining Files acceptance checks](docs/issue-6-reconciliation.md#hosted-acceptance-checks-still-required) and the detailed setup guides before deployment. Some older feature documents describe historical implementations; the active route wiring and SQL migrations are the implementation reference.
