# Database migration inventory

The shared development project is `zmtwlnmikhxfsbdtbtax` in organization studyCircle.
It now uses 17 public application tables plus Supabase-managed Auth tables.
The former schema had 18 models: User is represented by Auth and profiles;
VerificationToken is replaced by Supabase Auth verification, not a public token table.

No `.db`, `.sqlite`, or `.sqlite3` database was found in this checkout (including
the original configured root and schema directories), and there was no custom
DATABASE_URL in the local environment files. There were no stored local rows to
import. UI mock fixtures remain sample UI data; they are not a persisted database.

## Field mapping

| Original model | Supabase table | Preserved application fields |
|---|---|---|
| User | `profiles` | `id`, `email`, `name`, `major`, `interests`, `avatar_url`, `created_at` |
| VerificationToken | Supabase Auth | Token creation, expiry and verification managed by Auth |
| Course | `courses` | `id`, `code`, `title`, `term` |
| Professor | `professors` | `id`, `name` |
| Section | `sections` | `id`, `course_id`, `professor_id`, `section_code`, `days`, `start_time`, `end_time`, `location` |
| Enrollment | `enrollments` | `user_id`, `section_id` |
| Space | `spaces` | `id`, `course_id` |
| Subspace | `subspaces` | `id`, `space_id`, `professor_id` |
| Channel | `channels` | `id`, `subspace_id`, `name` |
| Message | `messages` | `id`, `channel_id`, `author_id`, `body`, `is_ai_response`, `meetup_id`, `created_at` |
| Meetup | `meetups` | `id`, `subspace_id`, `creator_id`, `title`, `blurb`, `location_name`, `lat`, `lng`, `starts_at`, `created_at` |
| MeetupAttendee | `meetup_attendees` | `meetup_id`, `user_id`, `joined_at` |
| LectureFolder | `lecture_folders` | `id`, `subspace_id`, `date`, `title` |
| Note | `notes` | `id`, `lecture_folder_id`, `uploader_id`, `file_name`, `file_url`, `mime_type`, `created_at` |
| LectureSummary | `lecture_summaries` | `id`, `lecture_folder_id`, `content`, `generated_at` |
| CourseSchedule | `course_schedules` | `id`, `subspace_id`, `raw_file_url`, `uploaded_at` |
| ScheduleItem | `schedule_items` | `id`, `schedule_id`, `type`, `title`, `date`, `is_cumulative`, `topics` |
| NotificationSetting | `notification_settings` | `user_id`, `event`, `email_enabled` |

`User.emailVerified` maps to `auth.users.email_confirmed_at`; email identity and
verification tokens are managed only by Auth. Profile name, major and interests
use empty-string defaults instead of nullable values. Profile `updated_at` is added.
Other optional scalar fields, defaults, composite keys and unique relationships
are retained. Non-user IDs stay text (accepting existing CUIDs); new defaults use
UUID strings. User references use the UUID assigned by Supabase Auth.

## Access and remaining feature work

All public tables have RLS and anonymous access is denied. Verified users can
browse the catalog, enroll themselves, and access content only in their enrolled
course/professor subspace. User-editable columns exclude identity and ownership.
Catalog, channels, lecture folders, AI summaries and initial schedules are created
by trusted server-side code, not arbitrary client writes. Privileged server jobs
must keep secret credentials server-only. No secret key is needed by the app setup.

This is the complete database schema and client foundation, not completed feature
UIs. Existing pages still use mock data. Signup UI, actual catalog import, Storage
bucket/upload implementation, email delivery and feature integrations remain
their respective issues. No note files existed locally to transfer.

Run `npm test` to verify every mapped field/type, relationships, and RLS isolation.
Run `npm run check:supabase` to check the live public connection and anonymous
denial on every application table. Both migrations are recorded in shared history.
