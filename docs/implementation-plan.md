# Implementation plan

Updated September 5, 2026: authentication remains the main workstream. Offline catalog validation is complete locally. The user also authorized two concurrent agents for database-independent meetup and chat interfaces, bounded parts of issues #4 and #5.

## Active parallel UI work — no Supabase required

- Meetups: demo cards, creation form, location pin, date/time validation, local join/leave and creator controls. Preview: `/preview/meetups`.
- Chat: predefined channels, message list/composer, and pinned meetup details. Preview: `/preview/chat`.
- Both use clearly fictional fixtures and temporary local state. Backend persistence, real messaging, authorization integration, and notifications remain deferred.
- Preview routes must not weaken authentication on existing app routes or expose real data.

## Offline task completed: catalog checker

- [x] Validate the proposed course/section/professor data format without Supabase or network calls.
- [x] Add an explicitly fictional fixture and command-line checker.
- [x] Cover date/time errors, duplicated identities, professor consistency, source URL spoofing, and demo labeling in 11 tests.
- [x] Document the contract in [catalog-format.md](catalog-format.md).
- [ ] Official source fetching, database import, and enrollment remain future work under #3.

## Active: auth foundation → authentication

1. [#1 Supabase setup](https://github.com/benjamina107/studycircle/issues/1): the team reports the shared project and both migrations are provisioned. Do not rerun applied migrations. Local connection and email delivery verification remain. Follow [supabase-setup.md](supabase-setup.md).
2. [#2 Auth](https://github.com/benjamina107/studycircle/issues/2): assigned to **benjamina107**.
   - [x] Supabase browser/server clients and cookie refresh.
   - [x] Cal Poly email/password signup and confirmation flow.
   - [x] Login/logout and verified-user page protection.
   - [x] Profile loading/editing, including picture URL.
   - [x] 5 auth input tests and the team's 2 database schema/access-policy suites pass. The old unpublished auth-only schema tests are archived locally.
   - [ ] Verify hosted confirmation, token reuse/expiry, session refresh and logout.
   - [ ] Configure production SMTP, redirects and password policy.
   - [ ] Add shared production rate limiting and account recovery when ready.

Code completion does not imply a live Supabase project has been configured. The issue remains open until its acceptance criteria are verified.

## Later: dependency order and possible parallel work

- After auth/setup: [#3 catalog/enrollment](https://github.com/benjamina107/studycircle/issues/3).
- After auth + enrollment, these can run concurrently:
  - [#4 meetups](https://github.com/benjamina107/studycircle/issues/4)
  - [#5 chat](https://github.com/benjamina107/studycircle/issues/5)
  - [#6 lecture notes](https://github.com/benjamina107/studycircle/issues/6)
- After auth and event-producing features: [#7 notifications](https://github.com/benjamina107/studycircle/issues/7).
- After notes/chat: [#8 ClassAI](https://github.com/benjamina107/studycircle/issues/8).
- After ClassAI: [#9 syllabus/schedules](https://github.com/benjamina107/studycircle/issues/9).
- After schedules/notifications: [#10 exam prep/reminders](https://github.com/benjamina107/studycircle/issues/10).
- [#11 moderation/ownership decisions](https://github.com/benjamina107/studycircle/issues/11) can be discussed independently.
- [#12 staging/mobile release checks](https://github.com/benjamina107/studycircle/issues/12) follow working MVP features.

No agents are continuing these deferred features. Their draft implementation files were preserved in the ignored local archive `.data/deferred/non-auth-work-20260905.tar.gz`; restore and review selectively when a feature is authorized. Do not extract the archive over newer work without comparing files.
