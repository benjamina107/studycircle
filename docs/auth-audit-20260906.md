# Auth fixes — September 6, 2026

Reproduced and corrected:

- Hosted redirect allowlist only included localhost, while APP_URL/browser used 127.0.0.1. Added exact `/verify` and `/api/auth/callback` paths for 127.0.0.1, preserving existing entries. Local Next dev normalizes Request.url to localhost; dev-only loopback matching now checks the actual Host on the same protocol/port. Production still uses the configured HTTPS origin with strict CSRF checks.
- Hosted confirmation template used ConfirmationURL, consuming the token on a GET before reaching a browser-bound PKCE exchange. New emails link directly to the app with TokenHash and require the explicit confirmation POST. Signup/resend now request `/verify`. The callback preserves old code exchanges and forwards new token-hash links without consuming them. This follows [Supabase's server-side email template guidance](https://supabase.com/docs/guides/auth/auth-email-templates).
- Signed-in students could remain on signup/login/verification forms. These pages now redirect verified sessions to Profile, where the existing onboarding gate applies.
- Login/logout/confirmation used cached client navigation immediately after cookie changes. They now load a fresh document; pending auth requests are canceled when their form unmounts and late responses cannot navigate elsewhere.
- Verification errors in legacy URL fragments were invisible to the server. The recovery UI recognizes error/token fragments, shows a plain recovery message, and clears the fragment without trusting provider text or importing implicit tokens.
- Resend unnecessarily asked for the signup email again; the email is now remembered within that browser tab. Passwords and tokens are not stored there. A valid confirmation page no longer shows a competing resend form below its main confirmation button.
- Login timeouts incorrectly told students to check email. Timeout messages now reflect the operation.

Hosted changes were applied and re-read successfully on project zmtwlnmikhxfsbdtbtax. Confirmation remains required; SMTP credentials, delivery limits and account verification status were not altered. The deployed template is recorded in `supabase/templates/confirmation.html`. Previously sent links retain their old behavior; expired or consumed links require a new email.

Checks: auth route/validation tests, request cancellation/timeouts, HTTP smoke checks, production build, and `npx tsx scripts/check-auth-live.ts --run`. The live script generates an unconfirmed disposable account and token without sending mail, proves GET does not confirm the user, confirms from a fresh cookie jar, exercises signed-in redirects/onboarding, wrong passwords, replay, logout cookie clearing and both loopback hosts, then deletes the synthetic account. Inbox delivery was not retested; no emails were sent during this audit.
