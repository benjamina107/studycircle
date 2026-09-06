# ClassAI and shared notes

Implemented scope: one knowledge base per course/professor/term subspace. Students upload one or several files with an optional free-text description; no lecture folder is required. `@AI` and `@ClassAI` in the authenticated class chat queue answers or question/answer cards. Cards have a preview and a copy button producing tab-separated fields and newline-separated rows for Quizlet's website import. There is no internal quiz player or automatic Quizlet publication.

No video, scheduled summaries, syllabus extraction, or missing-material checks are included. Existing lecture tables remain untouched for migration compatibility; new uploads use `kb_uploads` and `kb_assets`.

## Run locally

Use Node 22.22.2 (`nvm use`), install with `npm ci`, and configure `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
APP_URL=http://127.0.0.1:3000
```

A Supabase secret key can be used as `SUPABASE_SECRET_KEY` instead of the legacy service-role credential. Both it and the OpenAI key must remain server-only. Never put them in Git or `NEXT_PUBLIC_` variables. `OPENAI_RESPONSE_MODEL` optionally overrides the default `gpt-5.4-mini`. Embeddings use `text-embedding-3-small` with 1536 dimensions. Audio uses `whisper-1` for segment timestamps.

Run these in separate terminals:

```
npm run dev
npm run worker
```

The worker polls a durable database queue every three seconds when idle. Upload and question consumers run independently so a long PDF does not block chat. It claims jobs atomically, renews leases, retries failures up to three times with backoff, and rejects stale completions. A worker restart recovers expired leases. The UI polls messages and processing states; it does not run the processing itself. No AI content is generated on a calendar schedule.

Install FFmpeg/ffprobe on the worker and web server for audio validation. Override their executables with `FFMPEG_PATH` (verification only) and `FFPROBE_PATH` if necessary. Production deployment must run the worker as a supervised persistent Node process and allow the upload endpoint's request size and duration. A plain serverless Next deployment alone will not drain the queue.

## Data flow

1. Authenticated upload endpoint checks verified class membership, a database-backed rate limit, streamed request size, file signatures, and format limits.
2. Originals go into the private `class-notes` Storage bucket. Separate contribution rows preserve each uploader's filename and description.
3. SHA-256 deduplicates processing within a class, including concurrent contributions. A duplicate still retains its own original and ownership.
4. Worker extracts text, PDF pages, images, and audio. PDF pages and images use vision extraction; DOCX uses text extraction and ignores embedded images, explicitly disclosed in the uploader. Unreadable visual content is marked uncertain rather than intentionally filled in.
5. Passages retain locators and overlapping context, and receive embeddings in Postgres/pgvector. No generated summary is the source of truth.
6. An AI request retrieves relevant passages with semantic and lexical ranking, reduces near-duplicates, and includes varied sources. The model receives the previous 20 channel messages, including saved cards and source references, for follow-ups, and source content is explicitly treated as untrusted data.
7. Structured output is validated. Source IDs must belong to retrieved passages. Quizlet formatting is deterministic, with tabs/newlines removed from individual question/answer fields. Only actual separators are inserted.

## Access, deletion, and operational limits

RLS restricts reads to verified members of that subspace. All mutations and worker claims use server-only functions or endpoints with membership checks. Browser roles cannot forge AI messages, invoke worker functions, write embeddings, or write directly to Storage. Source links reauthorize access before issuing a 60-second signed download URL.

Only the uploader can remove or retry a contribution. Removing the final contribution deletes its indexed passages transactionally. Original files are queued for cleanup, so deletion survives a worker restart. Additional copies preserve their shared extraction. Historical AI responses remain in chat; links to removed contributions report that the file is unavailable. Regeneration requires a new mention.

Current limits: 1–5 files per contribution, 25 MB per file, 30 MB request ceiling (UI uses a 29 MB payload ceiling), 60 PDF pages, one hour per audio recording, 500 KB UTF-8 text, 20 MB expanded DOCX, and 250 passages per file. No old binary `.doc` or presentation/spreadsheet formats. DOCX embedded images need separate image uploads. Chat loads the latest 100 messages; contributions show the latest 200 while older indexed notes remain searchable. Maximum 40 cards per request, or fewer when the evidence is insufficient.

User limits per minute: 10 upload submissions, 30 messages, 5 AI requests, 5 upload retries. These are MVP limits; spending alerts, retention policy, moderation, and production monitoring remain deployment work. Extraction and model grounding are probabilistic: source citations and original downloads support checking the result, not a guarantee of correctness.

## Migration history

Remote history contains catalog version `202609050004` with no SQL body. The local marker records that fact without inventing catalog data. Existing repository migrations are preserved. New knowledge migrations are additive and do not reset or replay the shared database.

## Verification

```
npm run test:knowledge
npm test
npm run test:auth
npm run lint
npm run build
```

`npx tsx scripts/check-knowledge-live.ts --run` explicitly opts into paid model calls and temporary, isolated hosted fixtures. It creates a synthetic confirmed test user without sending an email, then checks authenticated uploads, extraction, deduplication, sourced Quizlet generation, isolation, and deletion. It removes only its own randomly identified fixtures afterward. It is not an email-verification test or an auth bypass in the app.

## Official integration references

- [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [Transcription and timestamps](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Structured output](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Quizlet import format](https://help.quizlet.com/hc/en-us/articles/360029977151-Creating-sets-by-importing-content)

## Main UI merge

The class header and navigation use the current main UI. The live Chat route retains the study_messages/AI pipeline, and Files uses kb_uploads so every new contribution is indexed. The separate upstream ClassChat/ClassFiles components and APIs are retained but are not the active workspace views. Incoming migrations were renumbered 008–011 because 005–007 already hold applied knowledge migrations; do not rewrite applied migration history.
