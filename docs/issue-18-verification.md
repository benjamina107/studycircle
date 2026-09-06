# Issue #18: account-flow failure handling

## Reproduced bugs

At baseline `fcf462f`, actual route-handler tests with a controlled Supabase
boundary reproduced provider HTTP 429/500 becoming login HTTP 401 and resend
HTTP 429 becoming HTTP 400. These incorrectly suggested credential problems or
hid operational rate limits. The independent review reproduced the same results.

The client submit handlers only used React state as a guard, had no request
timeout, and re-enabled controls before successful navigation completed. Signup
ignored the verification destination. Invalid token pages offered a doomed
confirmation button, and expired sessions redirected without context.

## Changes

- Map rate limits to 429 and service/network failures to 503 without returning
  provider messages. Keep missing, incorrect and unconfirmed account login errors
  indistinguishable, with a confirmation-email recovery path.
- Give weak-password and expired-token errors useful next steps. Clear any
  unconfirmed session returned by verification/callback before rejecting it.
- Share a 15-second request timeout and synchronous duplicate-request gate across
  signup, login, resend, verification and logout. Preserve typed fields on error,
  disable fields during a request, and permit manual retry without retry loops.
  A timeout does not imply that the server cancelled its work.
- Send accepted signup to `/verify`; verified login/confirmation stays on the
  existing `/profile` destination. Onboarding behavior is unchanged.
- Provide direct verification recovery links and a login session notice. Keep
  public account pages reachable if session refresh throws; protected routes
  still independently validate the user and database access still uses RLS.
- Explicitly explain unsupported password-recovery tokens. This issue does not
  add password reset, which has no implemented flow in this application.

## Verification

- `npm test`: 56 passing tests after the final main sync, including request duplicate/timeout/error cases.
- `node node_modules/tsx/dist/cli.mjs --test src/app/api/auth/*.test.ts`:
  17 passing tests, exercising real handlers with controlled service results for
  signup/login/logout, callback, valid/expired/unsupported tokens, private errors,
  rate limits, outage handling, validation and successful destinations.
- Independent runtime checks verified refreshed cookies, no-store/no-referrer,
  recovery during refresh errors, and missing-session redirect behavior.
- `AUTH_SMOKE_ORIGIN=http://localhost:3001 npm run test:auth:smoke` (set the
  environment variable with your shell's syntax): 29 live HTTP checks passed.
  These use invalid inputs/no credentials and do not send email or create users.
- Browser QA at 1280x800 and 390x844: login, signup and invalid verification
  layouts; desktop login and mobile resend Enter-key submissions; loading
  controls disable then recover; campus validation message and recovery links.
- Production build passed; lint has no errors and one existing MeetupCard image
  warning. An independent agent ran the TypeScript tests because the parent
  shell's tsx invocation encountered a Windows user-info runtime error.

Successful account transitions are covered with controlled service responses;
this run did not create another live student account or send another email.
The user subsequently confirmed that live login and logout work without issues.
Live session restoration after refresh was not separately confirmed by the user;
session refresh behavior passed the independent controlled runtime checks.
The earlier Resend delivery test is documented separately.

## Collaboration

Changes are confined to the existing account flow, its tests and documentation.
Main was synchronized before implementation. A merge check is a snapshot of the
currently published branches, not a guarantee against future overlapping edits.
The final independent review at `2b9caa4` verified clean simulated merges with
all fetched remote branches, including main `19c2f72`, and confirmed that the
final main merge preserved every issue #18 code change.
