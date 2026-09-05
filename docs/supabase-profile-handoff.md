# Shared development profile setup

Verified 2026-09-05 for issue #1. Organization: **studyCircle**. Project:
`zmtwlnmikhxfsbdtbtax` (West US/Oregon), used as the shared development database.
Dashboard: https://supabase.com/dashboard/project/zmtwlnmikhxfsbdtbtax
Issue owner: GitHub `wielandrod`; auth UI work is assigned to `benjamina107` in #2.
Use individual Supabase organization memberships; do not share account credentials.

## Migration and profile contract

`supabase/migrations/202609050001_initial.sql` was applied through SQL Editor.
Version `202609050001`, name `initial`, was recorded in
`supabase_migrations.schema_migrations` in the same transaction. Migration history
has RLS enabled and no public/anon/authenticated schema or table privileges.
Do not rerun the initial migration on this project. When using the Supabase CLI,
link this project, inspect `supabase migration list`, then use `supabase db push
--dry-run` before applying later versioned migrations. Never reset the shared DB.

The migration referenced in the team's setup guide was still absent from GitHub
main when this implementation was prepared. Coordinate this contract with #2;
do not publish a different SQL file using the same migration version.

`public.profiles` columns: `id` (Auth UUID), `email`, `name`, `major`, `interests`
(text), `avatar_url` (nullable text), `created_at`, `updated_at`.

- Auth inserts automatically create profiles; `raw_user_meta_data.name` initializes
  the name. Clients must not insert/upsert profile rows.
- Only verified, non-anonymous `@calpoly.edu` users can select/update their own row.
- Verification comes from `auth.users.email_confirmed_at`, not user-editable metadata.
- Clients can update only `name`, `major`, `interests`, and `avatar_url`.
- Email changes use Supabase Auth; the trigger syncs profile email and rejects
  non-campus addresses. Auth deletion cascades to the profile.
- The initial migration contains profiles only. The subsequent domain migration adds the remaining 16 tables; see `database-migration.md`. Storage buckets remain separate.

## Local connection

This checkout has a git-ignored `.env.local` with the shared project URL,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_URL=http://localhost:3000`.
Other developers obtain the publishable key from the project's Connect dialog.
No service-role key is required or present in these new settings.

Use `createClient` from `src/lib/supabase/client.ts` in browser components, or
await `createClient` from `src/lib/supabase/server.ts` in server code. `src/proxy.ts`
refreshes session cookies; it is not an authorization gate. Protected routes must
validate identity and confirmed campus email, and access profile data with the
user's session so RLS applies. The existing mock pages have not been converted into authenticated UI; that remains #2/other feature work. The old database adapter and tooling have been removed.

## Validation

- `npm run test:profiles`: in-memory PostgreSQL migration and RLS tests passed.
- `tests/hosted-profiles.sql`: passed in the shared project's SQL Editor; fixtures
  were rolled back and no email was sent. This does not prove email verification.
- `npm run check:supabase`: live public-key connection, required email confirmation,
  and anonymous profile denial passed.
- `npm run lint`, `npx next typegen`, `npx tsc --noEmit`, `npm run build`: passed.

Existing hosted settings: email signup/confirmation enabled, anonymous sign-in
disabled, minimum password length 12, Site URL `http://localhost:3000`, redirects
`http://localhost:3000/api/auth/callback` and `http://localhost:3000/verify`.
Custom SMTP, the custom confirmation template, and real Cal Poly inbox testing
remain pending. The team is deferring a sender domain. Issue #1 is not fully closed.

The obsolete database dependency tree has been removed; the resulting dependency audit reports zero vulnerabilities.
