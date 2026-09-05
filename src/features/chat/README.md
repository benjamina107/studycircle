# Chat preview — issue #5

This feature is intentionally isolated from the shared Supabase/auth work.
`types.ts` defines the proposed UI contract; it is not a database schema.
`mock-service.ts` implements it with sample enrollments and a sample joined
meetup. Messages are saved under `studycircle.chat.demo.v1` in localStorage.
They are visible only in this browser profile and origin, not to classmates.
The demo uses one fixed student identity. The Meetup page's Join button does
not update these sample pins.

## Try the preview

Open `/spaces/csc202/prof-khosmood/chat`, send a message, switch channels,
then reload. `/chats` lists sample enrolled channels and a joined meetup.
Browser offline mode exercises request errors. Sending more than ten new
messages in a minute exercises the provisional demo limit. The threshold
is a preview choice, not an agreed production policy.

## Team ownership and integration

- Chat owns this directory and the two chat page wrappers. Shared layouts,
  course data, auth, meetup creation, and existing Prisma schema are untouched.
- Agree on actual user IDs, table names, enrollment membership (course,
  professor, term), and the shared authenticated client with issues #1–3.
- Agree on attendance reads and destination channels with issue #4. Production
  pins must be derived from actual joins, and disappear on leave/removal.
- Replace the mock service with an adapter calling authenticated endpoints.
  Do not import a server-only Supabase client into client components.
- Coordinate one additive migration with the database owner for message
  indexes, idempotency keys, RLS, and database-enforced posting limits. Do not
  rewrite the foundation migration or independently regenerate shared types.
- Production list reads need bounded cursor pagination. This small demo reads
  all locally saved messages and is not a production history implementation.
- Enrollment checks, author identity, AI flags, meetup-link constraints, and
  posting limits must be enforced by the backend/RLS. Mock validation is not
  security. AI replies and user-created channels remain out of scope.

## Verification

On Node with TypeScript stripping support (the local environment uses Node 26):

```sh
node src/features/chat/mock-service.test.mjs
npm run lint
npm run build
```

The mock tests cover persistence, retry deduplication, channel isolation,
invalid messages, posting limits, offline/abort handling, storage failure,
and fixture integrity. They do not establish production access control.
Issue #5 remains open until Supabase integration, direct RLS allow/deny tests,
and the real multi-student workflow pass on staging.
