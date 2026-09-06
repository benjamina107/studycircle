# Supabase setup for the team

Use one shared development project, invite teammates using their own accounts, and keep production separate. The shared development project is `zmtwlnmikhxfsbdtbtax`; check its current migration status before changes. Setup covers Auth, domain data, private uploads, and ClassAI.

## Project configuration

1. Keep the database password in the team password manager. Copy the Project URL and publishable key from Connect into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Set `APP_URL=http://localhost:3000` locally.
2. Reconcile migrations below. Supabase Auth and Storage schemas must exist; knowledge migrations require pgvector. Confirm catalog sections and enrollments resolve the intended course/professor/term subspaces.
3. Enable email/password signup and **Confirm email**, set the password minimum to 12 characters, and disable anonymous sign-ins. The initial migration rejects non-`@calpoly.edu` accounts even when signup bypasses the app. Review compatibility before using a project with existing users/tables.
4. Set development Site URL to `http://localhost:3000`. Allow `http://localhost:3000/api/auth/callback` and `http://localhost:3000/verify`; configure exact HTTPS equivalents before deployment. Canonical `APP_URL` must match the browser origin for mutation checks.
5. Set the confirmation email template to `{{ .SiteURL }}/verify?token_hash={{ .TokenHash }}&type=email`. The verification UI requires an explicit confirmation action. The template uses Site URL; use a separate staging project for another origin.
6. Configure custom SMTP. The email handoff records Resend sending from `noreply@studycircles.me` and a successful real campus verification test that landed in Junk; this historical result is not a fresh hosted check. Fresh projects need their own SMTP credentials. See [email setup and repeatable checks](resend-email-setup.md).

## Reconcile and apply migrations

There are **14 versioned SQL files**, not two. The original 17-table inventory is a baseline; later migrations add tables, functions, policies, and buckets.

| Version | Purpose |
| --- | --- |
| 202609050001 | Initial profiles and campus-auth restrictions |
| 202609050002 | Domain schema and access policies |
| 202609050003 | Meetups |
| 202609050004 | Catalog historical marker; no executable SQL |
| 202609050005 | Knowledge base, jobs, private `class-notes` bucket |
| 202609050006 | Knowledge retrieval |
| 202609050007 | Knowledge consistency |
| 202609050008 | Sample catalog seed |
| 202609050009 | Legacy lecture folders, private `lecture-notes` bucket |
| 202609050010 | Separate class files, private `class-files` bucket |
| 202609050011 | Separate chat file integration |
| 202609050012 | Meetup integrity repair |
| 202609050013 | Private AI chat |
| 202609050014 | Classmates/direct messages |

`202609050004_catalog.sql` contains only comments recording an empty historical remote entry. Preserve it; do not invent catalog SQL, treat it as an import, or rewrite applied history. Review version 008's sample data for the target project. Older feature docs calling class files/chat files versions 004/005 predate renumbering: the actual files are 010/011. Use the on-disk sequence above.

With the Supabase CLI, inspect the intended target before applying anything:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push --dry-run
# After reviewing target, history, and pending SQL:
supabase db push
```

For a fresh project, apply the sequence in version order, including the empty marker in history. For an existing project, apply only missing reviewed migrations. Do not reset the shared database or replay applied initial/domain SQL. Follow the password prompt and keep migration history in Git. If SQL Editor was used, reconcile actual schema and migration history before a later CLI push; do not mark versions applied merely to silence mismatches. This reconciliation neither applied nor verified hosted migrations.

## Each developer: run locally

Copy `.env.example` to `.env.local`, configure the project, then run `npm install` and `npm run dev`. Auth/profile uses publishable-key cookie-scoped clients and RLS. Active Files/AI endpoints also need server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; the worker needs that credential and `OPENAI_API_KEY`.

Run `npm run worker` separately for extraction, AI replies, retries, and queued original-file cleanup. `OPENAI_RESPONSE_MODEL` optionally overrides the default. Install ffprobe on web and worker hosts (`FFPROBE_PATH` overrides its path); optional live verification tooling also uses FFmpeg. Production must supervise a persistent Node worker and allow the upload route's 30,000,000-byte request ceiling and processing duration (`maxDuration=120` does not prove the host permits it). See [AI operations and limits](ai-knowledge-base.md).

Never place service-role/secret, OpenAI, database-password, or SMTP credentials in `NEXT_PUBLIC_` variables, Git, browser code, or GitHub issues. The publishable key is intended for client use and relies on RLS. Keep private buckets private; do not loosen policies to make a smoke test pass.

## Hosted acceptance checks

- [ ] Compare all 14 versions with target migration history and inspect actual tables, functions, grants, policies, and buckets. History alone does not prove runtime behavior.
- [ ] Verify real campus signup email delivery, one-time confirmation, and expired/reused-link failures. Test login, logout, refresh, unverified-user denial, and profile isolation on staging.
- [ ] Confirm HTTPS URLs, Auth redirects, sender, password policy, and production rate limiting. Account recovery/reset remains separate work.
- [ ] Check private `class-notes` upload/list/preview/download, membership isolation, processing, retry, deletion, and signed-link expiry using the [issue #6 checklist](issue-6-reconciliation.md#hosted-acceptance-checks-still-required).
- [ ] Verify deployed web/worker credentials, binaries, request limits, logs, and recovery after worker restart.

`npm run check:supabase` checks Auth settings and anonymous denial for the original 17-table contract only. Local SQL tests use PGlite and mocked Supabase facilities; they do not prove hosted Storage HTTP behavior, email delivery, browser sessions, or model processing. The opt-in live knowledge script in the AI guide creates temporary hosted fixtures and makes paid model calls; it was not run for this reconciliation.
