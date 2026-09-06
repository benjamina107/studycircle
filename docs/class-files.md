# Class files

`src/features/files/ClassFiles.tsx` exports the default client component `ClassFiles({ subspaceId: string })`. The main page owns class selection, shell, and routing. The component provides loading, empty, retry, file selection, upload pending/success/error, download, and cursor-based Load more states. It uses the shared green neutral palette in an owned CSS module. Class changes remount local state to prevent late responses from appearing in another class.

## API contract

All routes use the server-only cookie-scoped Supabase client and `auth.getUser()`. No service-role key, public object URL, or browser-side Storage client is used. Membership is checked with `is_subspace_member`, which matches both course and professor across enrolled sections, and enforced again by database/Storage RLS.

- `GET /api/class-files?subspaceId=...` returns `{ files: ClassFile[], hasMore: boolean, nextCursor: string | null }`, newest first, by `created_at DESC, id DESC`. Each page returns at most 200 entries. To browse older files, send the returned opaque cursor in the optional `cursor` query parameter using `URLSearchParams`. Every page rechecks class membership. The cursor retains timestamp microseconds and uses the UUID as a tiebreaker. The `files` key stays compatible with existing consumers; direct uploads remain browsable through Load more.
- `POST /api/class-files` takes multipart fields `subspaceId` and `file` (exactly one each), returning HTTP 201 `{ file: ClassFile }`. The shared `assertSameOrigin` requires an Origin matching canonical `APP_URL`; missing/null/foreign Origins and cross-site requests are rejected. In development only, the shared helper can fall back to the request URL when `APP_URL` is absent.
- `GET /api/class-files/[id]/download` validates the current user and membership, reads metadata under RLS, validates the stored path, then redirects to a 60-second signed attachment URL. Clients should use this endpoint each time, including chat attachments.
- Error responses have `{ error: string }` with plain-language copy. Statuses include 400 invalid input, 401 signed out, 403 unavailable membership/origin, 404 missing or inaccessible file, 413 too large, 415 unsupported content, and 503 temporary failure. No raw provider error is returned. Browser fetch/JSON failures are mapped to safe UI copy.
- API responses and redirects use `Cache-Control: private, no-store`. Signed links are bearer links: an already-issued link can work until its 60-second expiry after unenrollment. New download requests fail once membership is removed. This follows [Supabase signed URL behavior](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl).

`ClassFile` has the exact string/number fields in `src/features/files/types.ts`: `id`, `name`, `size`, `mime_type`, `created_at`, `uploader_id`, and `subspace_id`. Database `class_files.id` is **UUID**, serialized as a string in JSON, compatible with migration 005's `messages.file_id UUID` foreign key. `object_path` is database-only and omitted from list/upload responses.

## Storage and validation

Migration `202609050004_class_files.sql` creates private bucket `class-files` and metadata table `public.class_files`. It sets `public=false` even if a bucket with that ID already exists. End-user bucket mutation guards prevent making it public. The bucket has a 10 MiB limit and a MIME allowlist for PDF, PNG, JPEG, TXT, and CSV.

Uploads enforce nonempty files, 180-character filenames, no separators/control/bidi characters, permitted extensions, matching declared MIME (or empty/octet-stream declarations), and byte signatures for PDF/PNG/JPEG or valid UTF-8 text without binary control bytes. These checks identify obvious mismatches, not malware or full document validity. Original filenames are display/download labels only. Object keys are generated as `<subspaceId>/<authenticated-user-uuid>/<random-v4-file-uuid>.<extension>`, never supplied by the caller. Subspace IDs must be 1–128 ASCII letters, digits, underscores, or hyphens.

The multipart parser counts actual streamed bytes and cancels over 10 MiB + 64 KiB overhead, regardless of Content-Length. Storage independently enforces its configured size/MIME restrictions. The application’s byte inspection is an API guarantee; a member using Supabase's authenticated Storage API directly is still subject to RLS/bucket constraints, but PostgreSQL cannot inspect object bytes. Files are served as attachments, and HTML/SVG/executables are not accepted types.

Metadata inserts must belong to the current member and match an existing owned Storage object's path, size, and MIME metadata. Clients cannot supply creation timestamps or update/delete published metadata. Published objects cannot be overwritten, moved, or deleted through end-user Storage policies. Restrictive Storage policies preserve isolation even alongside broader permissive project policies. Owners can read/remove their pending, unregistered objects only while still members; peers can access registered objects only.

## Failure recovery

Storage uploads and metadata inserts are not atomic. On an upload/metadata error, the API first checks whether metadata actually committed (for example, after a lost response). A confirmed row is returned as success. Otherwise it requests removal of the exact generated object with the same user-scoped client. It reports removal only if Storage confirms that exact object was removed. Read/removal errors, an empty removal result, membership loss, or ambiguous outcomes produce honest uncertainty copy with a reference ID and a server reconciliation log. The UI advises refreshing before retrying.

A process crash or lost session can leave an unregistered private object. There is no background orphan sweeper in this feature. An operator should investigate logged IDs and remove confirmed unreferenced objects through the Storage API/dashboard, not SQL deletion of `storage.objects` (which would leave physical bytes behind). Never delete an object with a matching published `class_files` row. The application does not elevate privileges to clean up.

## Deployment requirements (not performed)

1. Apply migrations 001–003, then **004 before 005**, using the normal trusted Supabase migration process. Supabase Auth and Storage schemas must already exist. Migration 004 is local only in this change; no hosted SQL or bucket change was made.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and canonical HTTPS `APP_URL` in production. Use the existing publishable-key SSR client. Do not add a service-role key.
3. Confirm the deployed bucket remains private and the migration's restrictive policies are installed. Existing catalog, sections, and enrollments must resolve each class's course/professor membership.
4. Configure hosting/proxy request-body limits to permit 10 MiB + multipart overhead. A platform with a lower body limit will reject larger uploads before this route runs. Keep the Storage bucket limit aligned with the app constant if changing the limit later.
5. Smoke-test on real Supabase with two members, a different professor, a different course, and an unenrolled user: upload, peer download, denial, removal of enrollment, and failure recovery. Local PGlite uses a mocked Storage schema; it does not exercise the deployed Storage HTTP service, object bytes, signing, or provider limits.

## Verification and changed paths

Run `node --test tests/class-files*.mjs` (also included by `npm test`). Tests cover actual PGlite RLS/grants with migrations 001–005, UUID FK integration and inline attachment behavior, restrictive guards against broad policies, course/professor boundaries, unenrollment, malformed paths/metadata, size/type/content/body validation, route contracts/auth/origin/pagination/signing, sanitized browser errors, and confirmed/uncertain cleanup. Upload tests use `tsx/cjs/api` scoped require so extensionless TypeScript imports resolve under ordinary `node --test`.

Owned changes only:

- `src/features/files/`: `ClassFiles.tsx`, `ClassFiles.module.css`, `types.ts`, `validation.ts`, `server.ts`, `upload.ts`, `client.ts`.
- `src/app/api/class-files/route.ts` and `src/app/api/class-files/[id]/download/route.ts`.
- `supabase/migrations/202609050004_class_files.sql`.
- `tests/class-files-api.test.mjs`, `tests/class-files-policy.test.mjs`, `tests/class-files-upload.test.mjs`, `tests/class-files-validation.test.mjs`, `tests/class-files-client.test.mjs`.
- `docs/class-files.md`.

No chat files, 005 migration, shell/page routes, or `public/logo-concepts` are owned or edited by this feature. No commit, push, or deployment was performed.
