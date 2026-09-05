# Supabase setup for the team — authentication only

You need **one shared development Supabase project**, not one project per teammate. Invite teammates to the organization using their own accounts. Keep production separate when ready.

This guide is being published ahead of the authentication code. You can create the project and configure Auth now; apply the migration and run the new auth flow once the implementation from [issue #2](https://github.com/benjamina107/studycircle/issues/2) is shared.

## One teammate: project configuration

1. Create the project and keep its database password in your team's password manager.
2. Copy the Project URL and publishable key from the Connect dialog into each developer's `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `APP_URL=http://localhost:3000`
3. Apply `supabase/migrations/202609050001_initial.sql`. It creates only profiles, a campus-domain signup trigger, and profile access policies. Catalog/meetup/chat/notes tables and Storage buckets are deferred.
4. Enable email/password signup and **Confirm email** in Authentication. Set the password minimum to 12 characters to match the app. Keep anonymous sign-ins disabled.
5. Set Site URL to `http://localhost:3000` for development. Allow `http://localhost:3000/api/auth/callback` and `http://localhost:3000/verify` under Redirect URLs. Add the exact HTTPS equivalents before deployment.
6. Set the confirmation email link to `{{ .SiteURL }}/verify?token_hash={{ .TokenHash }}&type=email`. The verification page requires a click before consuming the token. This template uses Site URL; use a separate staging project to test a different deployment origin.
7. Configure **custom SMTP** before student testing. Supabase's default sender is restricted to team-authorized recipient addresses; arbitrary student addresses need a configured sender. Supabase sends verification email directly.

The database rejects non-`@calpoly.edu` accounts even if signup bypasses our app. Apply this initial migration to a fresh project; if reusing a project with existing users/tables, review compatibility first.

## Apply the migration

With Supabase CLI installed, run from this repository:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Follow the CLI's password prompt if needed. Keep migration history in Git. Do not reset the shared database. Alternatively, for a fresh project you can run the SQL file once in SQL Editor, but reconcile its migration history before later using the CLI.

## Each developer: run locally

Create `.env.local` using `.env.example`, add the project settings, then:

```sh
npm install
npm run dev
```

Sign up with a real Cal Poly email address, follow the confirmation email, and verify that the app opens your profile. Test logout, wrong password, expired/reused confirmation links, and refresh. No bypass account or fake successful verification is included.

**No service-role key or Storage setup is required for the current auth work.** The publishable key is intended for client use and relies on RLS. Never place a service-role/secret key in a `NEXT_PUBLIC_` variable or a GitHub issue.

## Before calling auth complete

- [ ] Real confirmation email arrives and the link verifies once.
- [ ] Unverified users cannot access protected pages or profiles.
- [ ] Password login, session refresh, and logout work on staging.
- [ ] One user cannot read/update another user's profile or email.
- [ ] HTTPS app URL, redirects, sender, password policy and production rate limiting are configured.
- [ ] Account recovery/reset is planned separately; not yet implemented.

Local SQL tests exercise the auth migration against an in-memory Postgres with a minimal Supabase Auth fixture. They do not prove hosted email delivery or browser session behavior.

The old ignored SQLite file remains on disk as a backup. Prisma is no longer a runtime dependency.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [migrations](https://supabase.com/docs/guides/local-development/database-migrations), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
