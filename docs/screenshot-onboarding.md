# Screenshot class setup

Onboarding is now two steps: save profile details, then find classes from screenshots or manual search. Saving profile details goes to `/onboarding?step=classes`; completion is recorded only when the student joins reviewed classes or explicitly skips. Returning students can use the same signed-in URL without resetting their profile.

The guide links to https://my.calpoly.edu and explains logging in, scrolling to enrolled classes, and capturing course/section codes. Up to four PNG/JPEG/WebP screenshots are accepted (5 MB each, bounded request body 12 MB). Images are decoded, pixel-limited, re-encoded to strip metadata and processed in memory. They are not put in Storage, class files, or the shared knowledge base. OpenAI requests use `store:false`; provider-side retention follows the project's OpenAI data settings. See the [image input documentation](https://developers.openai.com/api/docs/guides/images-vision).

Circle AI extracts only visible course codes, section codes, instructor names and term with a strict JSON schema. Catalog lookup and matching are deterministic. Exact section codes resolve instructor identity even when the screenshot has no instructor names. Conflicting, missing or ambiguous matches require a choice; unknown courses do not create catalog entries. Lecture and lab rows sharing a course and professor enroll only once. The full selection is validated before one enrollment batch. Existing memberships are preserved, repeated requests are idempotent, and a failed completion can be retried.

`POST /api/onboarding/classes` extracts and matches; it does not enroll. `PATCH` adds reviewed section IDs and finishes onboarding. Both require verified Cal Poly authentication and same-origin requests; writes use the authenticated user's RLS client. Parsing is limited to four attempts per minute per account using the existing shared quota function. No new database migration or environment variable is needed; existing OpenAI and Supabase configuration is used.

Validation:
- `npm run test:onboarding`: pure matching cases (ambiguous/cross-term/conflicting matches, duplicates, unassigned and missing courses).
- `npx tsx scripts/check-schedule-import-live.ts --run /absolute/path/to/schedule.png`: real hosted flow with a disposable user, including image validation, auth/origin guards, no writes before review, invalid-batch rejection, repeat import and skip. The script deletes only its synthetic user and memberships.
- `/preview/onboarding`: development-only view of the actual class-step component. Import/search still require signing in.
