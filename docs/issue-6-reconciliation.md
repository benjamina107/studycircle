# Issue #6: lecture folders and private uploads reconciliation

This is a local implementation review and proposed issue note, not a hosted acceptance result. No issue state/comment, commit, push, migration application, or deployment was performed. Scope follows the supplied issue requirements: #6 requested generated lecture folders and private uploads; #17 explicitly supersedes required folders with class-wide shared notes.

## What exists and what is superseded

| Requirement | Local evidence and disposition |
| --- | --- |
| Generate lecture folders from teaching dates | Migration `202609050009_lecture_uploads.sql` defines teaching periods, `generate_lecture_folders`, and private `lecture-notes` Storage policies. `src/lib/lecture-schedule.js` and its tests cover schedule dates. Legacy `lectures/actions.ts` still calls the generator. These are retained implementation artifacts, not proof of an active folder workflow. Required folders are superseded by #17. |
| Active lecture navigation | `src/app/(app)/spaces/[spaceId]/[subspaceId]/lectures/page.tsx` redirects to the corresponding Files URL. `files/page.tsx` requires a user and renders `Notes` from `src/components/study/ClassWorkspace.tsx`. It does not render the legacy lecture uploader or separate `ClassFiles` component. |
| Private class uploads | `Notes` uses `/api/study/uploads`. The route checks class access and quotas, validates 1–5 files and actual streamed request size, writes originals to private `class-notes`, and attaches `kb_uploads` to deduplicated `kb_assets`. Membership checks and RLS scope access to the class. Implemented locally; hosted enforcement still needs testing. |
| Processing and AI | Migrations 005–007 provide knowledge data/jobs/retrieval. `scripts/knowledge-worker.ts` and `src/lib/knowledge/worker.ts` process uploads and questions, using leases, retries, indexed passages, and queued cleanup. The deployed app requires a separate persistent worker. |
| Preview, download, retry, removal | `src/app/api/study/uploads/[id]/route.ts` reads metadata under user-scoped RLS before privileged Storage access. Downloads sign for 60 seconds; PDF/image/audio previews sign for 3,600 seconds. TXT/DOCX previews return extracted text. Only the uploader can retry/remove. Final-contribution removal drops indexed passages and queues original cleanup. |
| Other retained file features | Migration 010 and `/api/class-files` use `class_files`/`class-files`; migration 011 adds separate chat-file integration. Their tests do not establish correctness of the active `kb_uploads` view. Migration 009's `lecture-notes` bucket is also distinct from active `class-notes`. |

There are 14 local migration files (001–014). Version 004 contains comments only, preserving an empty historical catalog entry; it supplies no catalog SQL. Do not fabricate its contents or infer that all hosted versions are applied. [Team setup](supabase-setup.md) gives the current sequence and replaces obsolete two-migration/auth-only guidance. Earlier feature-doc references to class files/chat files as 004/005 are historical numbering, not deployment instructions for this checkout.

## Focused local evidence

Read the root `AGENTS.md` and installed Next.js deployment and `redirect` documentation. Inspected the routes, component, worker, access helpers, migration files, and tests cited above.

Commands run for this reconciliation:

```sh
node --test tests/lecture-schedule.test.mjs tests/lecture-uploads-migration.test.mjs tests/knowledge-migration.test.mjs
node node_modules/tsx/dist/cli.mjs --test src/lib/knowledge/shared.test.ts
```

Results: **4/4** and **7/7** tests passed. The TypeScript runner required an unsandboxed retry after Windows `userInfo` initialization failed; `npm` was unavailable on the shell PATH, so the installed runner was invoked through Node. The parent owns full-suite verification; no full-suite result is asserted here.

The schedule tests exercise a JavaScript helper, not the SQL generator. The lecture migration test checks SQL text fragments, not execution or hosted Storage policies. The knowledge PGlite test executes migrations 001, 002, and 005–007 with mocked Auth/Storage facilities; it checks class isolation, deduplication, worker claim/completion fencing, retrieval, and removal. Shared tests check formatting, retrieval, mentions, and selected invalid uploads. These tests do not exercise the hosted Storage HTTP service, deployed routes, actual audio/model processing, or all 14 migrations together.

## Hosted acceptance checks still required

1. Record target project and deployed revision; compare `supabase migration list` with all 14 local files and inspect actual schema/policies. Review only missing versions before applying. Check knowledge functions/grants and pgvector, and verify `class-notes` remains private with no browser write access. Inspect legacy buckets separately if those APIs remain exposed. Never reset the shared project or fill in marker 004.
2. With real verified users, enroll two in the same course/professor/term, plus users in a different professor group, different course, and no relevant enrollment. Open an old Lectures URL and confirm Files loads for members without generating or requiring a folder.
3. Through deployed Files, upload representative TXT, PDF, DOCX, image, and audio files with optional descriptions. Confirm list entries, previews, original downloads, filenames, processing states, and persistence after refresh. Check invalid/disguised types, more than five files, over-25-MB files, and over-30-MB requests are rejected; check host body/time limits do not reject supported uploads first.
4. Confirm peers can read but cannot retry/remove another uploader's contribution. Signed-out, unverified, unrelated, and unenrolled users must not list, preview, download, mutate, or retrieve indexed material. Test forged upload IDs and direct Storage access, not only hidden UI controls. After removing the last matching enrollment, new signed-link requests must fail. Previously issued download links can remain valid for 60 seconds and preview links for one hour; verify expiry. Downloaded copies cannot be revoked.
5. Verify the supervised worker has server-only Supabase/OpenAI credentials and ffprobe, processes a real upload to ready, and returns a grounded AI answer/Quizlet export with working source links. Test duplicate contributions, failed-job retry, and recovery after restarting during a job; confirm no duplicate/stale answer is published. Record any paid-model test separately from offline results.
6. Remove one duplicate contribution and confirm remaining material stays searchable; remove the last and confirm indexed passages disappear and the worker removes queued original objects. Confirm old source links report unavailable and historical answers are not mistaken for regenerated content.
7. Record actual outcomes, timestamps, and sanitized logs for each check. Do not run the opt-in live knowledge script as an implicit read-only check: it creates temporary hosted fixtures and incurs model calls. No hosted checks above were run for this docs task.

## Proposed issue closure/re-scope note (not posted)

> Re-scope #6 to private class uploads and hosted acceptance. The required generated-folder workflow is superseded by #17: old Lectures URLs now redirect to Files, which uses class-wide `kb_uploads`/`kb_assets`, private `class-notes` Storage, and the knowledge worker. Legacy folder generation and its migration remain for compatibility; they are not the current user workflow. Private uploads, preview/download, uploader retry/removal, and background indexing are implemented locally. Focused local checks passed (11 tests), but this does not establish hosted migration, Storage, or worker readiness. Keep #6 open for the hosted acceptance checklist in `docs/issue-6-reconciliation.md`. Once those results are attached, close #6 with the folder requirement explicitly marked superseded by #17. Alternatively, close the historical scope only after creating and linking a dedicated hosted-acceptance follow-up; do not describe unverified hosted behavior as complete.
