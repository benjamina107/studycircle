# Chat preview · issue #5

Public route: `/preview/chat` (outside the protected `(app)` group). Use
`?channel=homework` or `?channel=exam-prep` to open a predefined channel.
The page links to `/preview/meetups`, which the meetup task owns.

The same chat component is reused at `/spaces/[spaceId]/[subspaceId]/chat`.
`/chats` reuses the overview and links to the fictional
`/spaces/demo101/prof-lumen/chat` example. Existing auth remains in charge of
protected routes. These routes always show explicitly fictional fixtures,
independent of route IDs, the shared catalog, and shared mock data.

## Behavior

- Three predefined channels; no channel creation or separate meetup chats.
- The sample meetup pins a fixed fictional date, Pacific time, and imaginary
  location, and links into the existing general channel.
- Each channel retains its own draft while this component is mounted. Added
  messages remain in that channel only. Reloading or leaving discards them.
  Overview links change the route and may reset the demo; use the in-chat
  selector to preserve local messages and drafts.
- The overview shows static fixture summaries, not live activity or membership.
  Meetup participation is not synchronized with the separate meetups demo.
- Composer trims outside whitespace, rejects empty messages and messages over
  1,000 JavaScript string units after trimming, and preserves internal newlines.
- Enter inserts a newline. Ctrl/Command + Enter adds locally (except during
  text composition). Tab/Enter/Space operate native controls. The message log
  is keyboard-scrollable; status and errors use live announcements.
- `@ClassAI` mentions (case-insensitive) are explicitly rejected. There are no
  fake bot answers, delivery confirmations, calls, storage, or persistence.
- `src/components/chat/data-source.ts` is a separate, unimplemented contract
  for future authenticated data access. No demo code imports or invokes it.

## Integration boundary

No auth, layout, navigation, dependencies, shared data, meetup files, or backend
files were changed by this task. The existing global `src/proxy.ts` currently
matches preview paths and can refresh auth when configured. Consequently the
chat code has no backend calls, but the parent must assess the shared proxy
before claiming the whole served preview is network-independent. Do not remove
or weaken authentication for protected routes to accommodate the demo.

## Checks

Run scoped ESLint over `src/components/chat`, both protected chat pages, the
public preview page, and `src/lib/chat-demo*.ts`. Run logic tests with
`node_modules/.bin/tsx --test src/lib/chat-demo.test.ts`.

Verified in this task: scoped ESLint passed; all 9 logic tests passed; scoped
TypeScript passed with the installed Next global and image type declarations
included (for CSS module types). `git diff --check` passed. No full build,
browser session, backend call, or database command was run. Responsive rules
are implemented, but visual and browser interaction checks remain unverified.

Manual interaction checklist: add a trimmed multiline message, switch channels
and back, test an empty submission, paste 1,001 characters, reject a ClassAI
mention, use Ctrl/Command + Enter, follow the pinned general-channel link,
and reload to see fixtures restored. Inspect at 375px and desktop widths.
