# Meetups issue #4: local UI preview

Public preview: http://127.0.0.1:3000/preview/meetups

The same `MeetupsDemo` component is reused at `/spaces/[spaceId]/[subspaceId]/meetups`, behind the existing `(app)` authentication layout. Every route shows the explicit fictional viewer **Alex Sample**, independent of any signed-in identity. The route parameters do not select real course records.

## Behavior

- Responsive cards with initial avatars, participant counts, campus times and sample coordinates.
- Create a sample post with title, optional blurb, location, sample pin selection or manual decimal coordinates, date and time.
- Join/leave other sample meetups; hosts can remove sample participants but cannot remove themselves or leave their own meetup.
- Filter joined posts, exercise the empty state, and restore fixtures.
- All state is held in the mounted page's React state. Reloads and route remounts reset it. No local storage, database, API, emails, invitations, map requests, geolocation requests or server delivery are implemented by the meetup code.
- The footer links to `/preview/chat` without prefetching; there are no per-meetup chats or cross-page synchronization.
- Creation and membership notices explicitly describe local demo changes, never successful publication or notification.

## Validation and data boundary

`meetups-validation.ts` validates required trimmed titles/locations, lengths (80/120 characters; optional blurb 500), finite decimal latitude/longitude within ±90/±180, valid calendar dates from year 2000, and strictly future start times. Coordinates are geographic range checks, not verification of a campus venue.

All wall-clock values use `America/Los_Angeles`, regardless of device timezone. The resolver uses the installed Intl timezone database to find candidate instants. It rejects the spring DST gap and the repeated fall hour with an explicit explanation; there is no silent choice between two instants. Dates are stored as UTC ISO strings and rendered with the campus timezone abbreviation.

`MeetupDetails`, `MeetupPerson`, `MeetupRecord` and `MeetupsData` are plain data interfaces. Fixtures and immutable demo membership operations live separately from UI and validation. There is no future backend implementation hidden behind these interfaces. A future adapter must authenticate/authorize and validate again at its own boundary; demo checks do not supply production access control. Per-user posting/rate limits remain a future product decision.

## Parent integration notes

The existing shared `src/proxy.ts` matcher includes `/preview/meetups`. When Supabase is configured, that proxy calls auth before this fixture-only page renders. This assignment did not modify the auth proxy or any shared auth/layout file. To guarantee no Supabase calls for public fixture previews under a configured environment, the parent must narrowly exclude the public preview routes while preserving protected-route auth.

For this verification session, the dev process was started with both public Supabase configuration variables explicitly empty:

```sh
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='' ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3000
```

This overrides only this process's configuration; it does not edit environment files or weaken the protected layout. The preview rendered without login. No protected authenticated flow was exercised.

The separate chat assignment owns `/preview/chat`; that destination was not implemented or tested by this meetup assignment. No general-purpose subagent launch tool was available in this session. No separate user-owned tasks were substituted for the requested subagents.

## Changed paths

- `src/components/meetups/MeetupsDemo.tsx`
- `src/components/meetups/MeetupDemoCard.tsx`
- `src/components/meetups/MeetupCreateForm.tsx`
- `src/lib/meetups-demo.ts`
- `src/lib/meetups-demo.test.ts`
- `src/lib/meetups-validation.ts`
- `src/lib/meetups-validation.test.ts`
- `src/app/preview/meetups/page.tsx`
- `src/app/(app)/spaces/[spaceId]/[subspaceId]/meetups/page.tsx`
- `docs/meetups-preview.md`

The old `MeetupCard`, shared styles/navigation/layout/mock data, package files, implementation plan, auth and catalog changes were not edited by this assignment. No dependencies, migrations, backend integrations, commits or pushes were added.

## Verification

- 10 passing Node/tsx logic tests: summer/winter campus conversion, timezone date rollover, DST gap/overlap, invalid calendars/times, leap day, midnight, future boundary, empty/oversized text, invalid/boundary coordinates, immutable and idempotent joining, leaving, host-only removal, missing/started posts, creation ordering and fixture reset.
- Scoped ESLint passed for all nine meetup TypeScript/TSX files.
- Scoped TypeScript program using the installed project's compiler options: nine root files, zero diagnostics. No shared generated files or typecheck config were written.
- Browser checks: unauthenticated render; join and leave count changes; host removal; empty submission errors and focus; sample pin and tomorrow shortcuts; successful in-memory creation; empty state and restore; reload resets participants and created posts.
- Mobile check at 375 × 812: form and cards visually inspected, page width equals viewport width (375), no horizontal overflow. Temporary viewport override reset after checking.
- Browser console: no warnings or errors during these interactions.
- No full build was run.

Run the logic checks with:

```sh
./node_modules/.bin/tsx --test src/lib/meetups-validation.test.ts src/lib/meetups-demo.test.ts
```
