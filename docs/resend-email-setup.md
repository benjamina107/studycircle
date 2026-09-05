# Resend delivery for Supabase Auth

## Status

Prepared configuration only: Resend is not enabled on the shared project yet.
A verified sending domain and a Resend API key are required. The team does not
currently have a sending domain, so delivery to arbitrary Cal Poly addresses
cannot be enabled or tested yet. This document does not fix the live rate limit
by itself.

Supabase Auth continues to create and validate confirmation tokens and manage
sessions. Resend replaces Supabase's built-in email delivery service through
custom SMTP. Existing `supabase.auth.signUp()` calls need no Resend SDK or app
API key. Never mark a student verified merely because Resend accepted an email.

## Configure the shared project once

1. Add a domain you control to Resend and publish its required DNS records.
   Wait for Resend to report the domain verified. You do not need to host the
   StudyCircle website on that domain. The sender must use your verified domain;
   `@calpoly.edu` is the recipient domain, not a sender domain you control.
2. Create a Resend sending API key for that domain. Enter it directly in the
   Supabase dashboard; do not commit it or put it in a `NEXT_PUBLIC_` variable.
3. Open the shared StudyCircle project (`zmtwlnmikhxfsbdtbtax`) in Supabase:
   Authentication > Email > SMTP Settings. Enable custom SMTP and save:

   | Setting | Value |
   | --- | --- |
   | Sender name | StudyCircle |
   | Sender email | An address on your Resend-verified domain |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | Your Resend API key |

4. Keep Confirm email enabled and preserve the existing campus-domain
   restriction, Site URL, redirect allowlist, and verification template.
   Disable link tracking in Resend so confirmation links are not rewritten.
5. Review Authentication > Rate Limits after saving. The built-in sender's
   two-emails-per-hour allowance can be changed only with custom SMTP. Set the
   custom email allowance to fit the team's testing needs and Resend quota;
   keep abuse protections and the per-user resend interval enabled.

The SMTP password is project configuration, not a Next.js environment variable.
Adding `RESEND_API_KEY` or changing `.env.local` alone does not change hosted
Supabase Auth delivery. Notification email stubs are separate feature work.

## Verify delivery

- Use one real, authorized `@calpoly.edu` test account through the signup UI.
- Check Supabase Auth logs for the signup result and Resend logs for delivery.
- Confirm the message arrives, then verify that the link establishes a session
  and that the profile belongs to the signed-in user.
- Verify an expired/reused link cannot establish a new verification flow and
  an unverified account cannot access protected data.
- Do not call the cutover complete until an actual Cal Poly inbox receives
  the message. Local schema tests and `npm run check:supabase` do not test SMTP.

## If a rate-limit error remains

Inspect the Auth error code and logs before retrying. Project email limits,
per-user cooldowns, IP limits, and Resend quotas are separate. A new provider
does not disable Auth rate limits or promise that an exhausted window resets
immediately. Wait for the applicable window; avoid automatic resend loops.
Check that SMTP settings were saved, the sender domain is verified, and the
Resend key has sending permission. Never disable email confirmation to work
around delivery errors.

References: [Resend SMTP setup](https://resend.com/docs/send-with-supabase-smtp),
[Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits).
