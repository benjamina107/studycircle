# Feature issues

The product starts as a **mobile-friendly web app**. Only authentication is active in this task; the other issues are available for teammates. [Auth #2](https://github.com/benjamina107/studycircle/issues/2) is assigned to **benjamina107**.

## [#1: Set up shared Supabase project, Auth, Storage, and access policies](https://github.com/benjamina107/studycircle/issues/1)

Product spec §4, §6.1, §6.6. Outline/backlog; not being implemented by this task.

Dependencies: None.

- [ ] Apply the versioned Supabase migrations to a shared development project and document ownership.
- [ ] Configure email confirmation, allowed callback URLs, and custom SMTP; verify a real Cal Poly signup.
- [ ] Configure public app variables and keep service-role credentials server-only.
- [ ] Verify RLS denies anonymous/unverified and cross-professor/course access; private notes bucket is accessible only to enrolled classmates.

## [#2: Complete Cal Poly signup, login, profile, and session flows](https://github.com/benjamina107/studycircle/issues/2)

Product spec §6.1. Active auth work; live Supabase verification still required.

Dependencies: #1

- [ ] Students sign up with @calpoly.edu, confirm a single-use email link, log in, and log out through Supabase Auth.
- [ ] Unverified accounts cannot access app data, even through direct Supabase requests.
- [ ] Edit and persist name, major, interests, and profile photo; show useful validation errors.
- [ ] Verify session refresh, expired links, wrong password, and mobile forms against staging.

## [#3: Import the current Cal Poly catalog and let students select classes](https://github.com/benjamina107/studycircle/issues/3)

Product spec §4, §5, §6.1, §8.1. Outline/backlog; not being implemented by this task.

Dependencies: #1

- [ ] Confirm authoritative current-term course/section/professor/meeting-day source and document extraction method.
- [ ] Prefetch/import validated data atomically with explicit term dates and stable identities.
- [ ] Students select actual sections and see only their enrolled professor subspaces.
- [ ] Retain an explicitly labeled development fixture; no sample courses masquerade as real catalog.
- [ ] Reject silent professor reassignment that would move existing enrollment access.

## [#4: Create and join class meetups with map pins and attendee controls](https://github.com/benjamina107/studycircle/issues/4)

Product spec §6.4. Outline/backlog; not being implemented by this task.

Dependencies: #2, #3

- [ ] Create a future meetup with title, blurb, location pin, and time shown in a clear timezone.
- [ ] Show creator/attendee avatars; persist join and leave across refresh.
- [ ] Creator can remove an attendee; other students cannot modify someone else's attendance.
- [ ] Enforce same course/professor membership and a documented posting cap at the database layer.
- [ ] Joining surfaces the meetup in Chats without creating a separate meetup group chat.

## [#5: Ship predefined channel chat and joined meetup pins](https://github.com/benjamina107/studycircle/issues/5)

Product spec §6.2, §6.5. Outline/backlog; not being implemented by this task.

Dependencies: #2, #3

- [ ] Open predefined channels, send/read persisted messages, and see updates without a full navigation.
- [ ] Chats lists enrolled channels and joined meetups with location/time pins.
- [ ] RLS rejects cross-class messages, forged authors, AI impersonation, and arbitrary meetup links.
- [ ] Handle empty channels, network failures, polling cleanup, and posting limits.
- [ ] Keep user-created channels and per-meetup chats out of scope.

## [#6: Generate lecture folders and share private notes, photos, and PDFs](https://github.com/benjamina107/studycircle/issues/6)

Product spec §6.3, §6.6, §8.7. Outline/backlog; not being implemented by this task.

Dependencies: #2, #3

- [ ] Generate folders from explicit teaching dates and professor sections' meeting days; skip TBA meetings.
- [ ] Upload supported PDF/JPEG/PNG/text files with size/type validation and opaque Storage paths.
- [ ] Persist metadata and allow only enrolled classmates to download.
- [ ] Handle upload failures without claiming successful saves; validate Storage policies in staging.
- [ ] Agree on deletion/retention policy before adding uploader deletion.

## [#7: Persist notification preferences and deliver event/test emails](https://github.com/benjamina107/studycircle/issues/7)

Product spec §6.7. Outline/backlog; not being implemented by this task.

Dependencies: #2, #4, #5

- [ ] Persist individual choices for meetup joins, messages, mentions, and exam reminders.
- [ ] Test notification reports actual delivery-provider acceptance or an explicit failure.
- [ ] Send event emails only to authorized recipients respecting saved preferences.
- [ ] Configure and verify a sender; ensure disabled/missing providers do not claim delivery.
- [ ] Add durable delivery/retry and spam controls before production load.

## [#8: Add grounded lecture summaries and inline @ClassAI answers](https://github.com/benjamina107/studycircle/issues/8)

Product spec §6.5, §6.6. Outline/backlog; not being implemented by this task.

Dependencies: #6, #5

- [ ] Extract text/OCR from supported notes and retain professor/subspace-scoped context.
- [ ] Generate stored per-lecture summaries and answer lecture/class questions with source references.
- [ ] @ClassAI mentions produce inline replies without blocking or losing the student's message.
- [ ] Reject or clearly qualify questions unsupported by uploaded course material.
- [ ] Isolate class context, resist instructions embedded in uploads, and test provider failures/cost limits.

## [#9: Parse and edit a shared professor syllabus and exam schedule](https://github.com/benjamina107/studycircle/issues/9)

Product spec §6.3, §6.6. Outline/backlog; not being implemented by this task.

Dependencies: #8

- [ ] Upload syllabus and extract quiz/exam dates, cumulative flags, and topics.
- [ ] Provide review/edit controls because syllabus dates are tentative.
- [ ] Reuse a schedule across the same professor's sections in a course/term.
- [ ] Render actual upcoming-exam banners in campus timezone; do not use sample dates.

## [#10: Generate exam study guides, practice tests, and one-week reminders](https://github.com/benjamina107/studycircle/issues/10)

Product spec §6.6. Outline/backlog; not being implemented by this task.

Dependencies: #9, #7

- [ ] Select relevant lectures based on exam topics and cumulative scope.
- [ ] Generate and store a study guide and practice test with cited course material.
- [ ] Run roughly one week before exams and show results in the subspace.
- [ ] Deduplicate generation/email reminders and handle schedule edits and retries.

## [#11: Decide moderation, posting limits, and notes ownership policies](https://github.com/benjamina107/studycircle/issues/11)

Product spec §8. Outline/backlog; not being implemented by this task.

Dependencies: None.

- [ ] Assign responsibility and process for channel moderation and reports.
- [ ] Confirm per-user caps for meetups, messages, uploads, and AI requests.
- [ ] Define note visibility, uploader deletion, retention, and derived-summary removal.
- [ ] Confirm per-professor schedule sharing assumptions without reopening rejected user-created chats.

## [#12: Verify the MVP on staging and prepare a mobile release](https://github.com/benjamina107/studycircle/issues/12)

Product spec §10. Outline/backlog; not being implemented by this task.

Dependencies: #2, #3, #4, #5, #6, #7

- [ ] Run lint, type/build checks, database RLS tests, and browser workflows.
- [ ] Exercise signup → confirmation → enrollment → chat/meetup → notes with two actual staging accounts.
- [ ] Test mobile layout, keyboard/accessibility, refresh persistence, and failed requests.
- [ ] Validate hosted Supabase Auth, private Storage, and actual email delivery.
- [ ] Document production configuration, backups, monitoring, and remaining MVP exclusions.
