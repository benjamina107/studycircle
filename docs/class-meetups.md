# Class meetups

Entry point: `src/features/class-meetups/ClassMeetups.tsx` exports default async `ClassMeetups({ spaceId, subspaceId })`. The route owner should render it inside the verified selected-group wrapper. No existing routes or meetup actions are changed by this feature.

The component independently calls `requireUser`, validates the subspace's `space_id`, and checks the session's `is_subspace_member` RPC (course AND professor). Creation and RSVP repeat these checks on every invocation, including bound arguments. All reads and writes use the cookie/session Supabase client and RLS, with no service key or mock data. RSVP uses its own scoped action because the existing feed action does not accept the selected parent pair.

Upcoming meetups are scoped to the selected subspace, ordered by start and ID, limited to the next 100 (disclosed in the UI). Attendance reads are limited to this user and the displayed meetup IDs. Empty, inaccessible and failed-load states are distinct; a failed attendance query never renders guessed RSVP state.

Creation accepts title, optional blurb, location, date and time. Server validation uses shared limits and `resolveCampusTime`, rejecting malformed dates, past starts, nonexistent spring hours and ambiguous fall hours. All wall-clock input and display use America/Los_Angeles regardless of browser timezone. Coordinates are optional in the schema and are omitted, never fabricated.

Migration `202609050003_meetups.sql` is required: the insert explicitly supplies `time_zone`, the host-attendee trigger owns host attendance, and the atomic UTC daily counter enforces five creations per user. There is one insert attempt and no fallback for missing migrations. Provider/SQL errors are replaced with fixed user-facing messages. The known daily-cap code gets a specific message. RLS remains authoritative if membership changes during a request.

The CSS module is neutral/green and independent of global feed styles. The create button expands an inline labeled form and focuses its title. Controlled inputs survive server validation/write errors. Pending submission disables fields, cancellation and the toggle. Success closes the form, announces confirmation, restores focus and refreshes the route. Failed client transport warns that persistence may have occurred and asks for a refresh before retrying. RSVP prevents host departure and changes after start server-side; successful writes revalidate the spaces layout.

Local checks: `node --test tests/class-meetups.test.mjs`, `npx eslint src/features/class-meetups tests/class-meetups.test.mjs`, and `npx tsc --noEmit --incremental false`. Action tests stub auth/cache/session query boundaries and exercise the real authorization helper, validation and actions. They perform no hosted mutations. Existing database integrity coverage is available via `node --test tests/meetups-migration.test.mjs`.

Implementation verification: all 11 feature tests and the existing migration contract test passed, and feature ESLint passed. The unmodified full typecheck encountered duplicate generated `.next/types/* 3.ts` declarations. A read-only TypeScript compiler check excluding only generated filenames ending in ` <number>.ts` returned zero diagnostics; no generated files were edited or deleted.

Integration browser check (once the main route owner mounts the component): verify keyboard expansion/cancel/focus, preserved input on errors, mobile layout, success refresh, host badge, join/cancel, and empty/load-error states using an enrolled test account. No hosted mutations are needed for the automated tests.
