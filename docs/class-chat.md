# Live class chat

Import the default `ClassChat` from `src/features/class-chat/ClassChat.tsx` and render `<ClassChat subspaceId={selectedSubspaceId} />` inside the globally selected group's **Chat** tab. The parent owns the **Meetups | Chat | Files** tabs and `/chat` route. Chat contains only General and Homework channel controls; it does not render a group picker, meetup channel, or folder sidebar. Changing the group resets the conversation. Migration 007 backfills lowercase `general` and `homework` channels and provisions both after each new subspace insert through a server-owned security-definer trigger. Existing channels and messages are preserved.

## Requests

- New UI: `GET /api/chat/messages?subspaceId=SUBSPACE_ID&channelName=general` (or `homework`) → `{ channel: { id, name }, messages: [...] }`. Omitting `channelName` selects General.
- Compatible existing client: `GET /api/chat/messages?channel=CHANNEL_ID` → message array. `channel` takes precedence if both forms are supplied.
- `POST /api/chat/messages`, JSON `{ channelId, requestId, body, file_id? }` → one message. `requestId` remains a caller-generated string, as in the existing text-ID schema. The new UI uses a UUID. `file_id` is a UUID or null. Only one file is accepted. Empty body is replaced with the attached file's name; text is trimmed and limited to 2,000 characters.
- Messages preserve `id`, `channelId`, `authorId`, `authorName`, `body`, `createdAt`, and `requestId`, and add `file: null | { id, name, size, mime_type, created_at, uploader_id, subspace_id }`. Names are server-derived labels (`You` or `Classmate`). No profile metadata is fabricated or exposed.
- Existing files: `GET /api/class-files?subspaceId=SUBSPACE_ID` → `{ files: [...] }`.
- Inline upload: multipart `POST /api/class-files`, fields `subspaceId` and `file` → `{ file: ... }`.
- Attachment links use `/api/class-files/FILE_ID/download`, which the Files API authorizes before redirecting. No storage paths or public bucket links are returned by chat.

Every chat request validates the Supabase user, verified non-anonymous Cal Poly identity, and `is_subspace_member` for the channel. The API uses the cookie-scoped Supabase client, never a service role. POST requires a matching Origin and rejects cross-site requests using the existing application origin validator (`APP_URL` is required in production). GET accepts absent Origin for normal same-origin fetches and rejects explicitly foreign origins/cross-site fetch metadata. Reads and client fetches use `no-store`.

## Live behavior and failures

The UI polls the latest 100 messages every five seconds, oldest first, with a stable timestamp/ID order. Poll requests do not overlap, and are aborted on group/channel changes. Scrolling stays at the bottom only when the reader was already near the bottom. Access/connection failures clear the visible conversation and disable sending until access is re-established; there is no fixture fallback. Historical pagination is not provided.

If an upload succeeds but sending fails, the composer retains the returned file and request ID, says the file is in Files, and offers Retry send. Retrying the unchanged draft never repeats a confirmed upload; concurrent/repeated message requests return the original message when channel, text, and file match. Changing the draft creates a new retry ID. Switching General/Homework retains each channel's unsent draft, selected file, and retry state; only the visible channel polls. Switching groups or leaving the page resets drafts. Uploaded files remain in Files and can be chosen again. If an upload response itself is lost, completion cannot be established client-side; users should check Files before uploading again.

## Database and verification

Apply migrations 001–006, then `202609050011_chat_files.sql`. Migration 007 adds the nullable FK, attachment index, insert-column permission, restrictive read/write policies, and a trigger checking attachment/channel subspace equality. The trigger runs before the existing chat validation trigger so file-only inserts receive a filename body first. A deleted file clears the reference and retains the message. The separately owned pending chat hardening SQL remains untouched and is compatible with 007; its rate limiting and timestamp enforcement remain its responsibility. Missing schema changes return a readable 503, with no raw database details.

Run `node --test tests/chat-files*.test.mjs`. Tests cover API compatibility, authentication/verification/membership, origin rejection, identity derivation, attachment isolation, idempotency, concurrent retries, safe schema/rate-limit errors, and upload retry reuse. PGlite tests apply the real migrations 001–003 and 006–007 against minimal Supabase auth/storage infrastructure, with and without pending hardening. They also check channel backfill, future provisioning, and preservation of existing channels/messages. Also run TypeScript and ESLint checks on the owned files. An authenticated browser smoke test requires a configured Supabase instance with these migrations and two enrolled classes.
