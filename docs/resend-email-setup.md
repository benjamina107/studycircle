# Resend delivery for Supabase Auth

## Current confirmation flow (September 6, 2026)

New signup/resend emails use the token-hash template in
`supabase/templates/confirmation.html` and return to `/verify`. Confirmation
happens only after the student clicks the app's confirmation button. Both local
hostnames have exact redirect entries. See [auth audit](auth-audit-20260906.md)
for the applied settings and validation. Previously sent links are unchanged.

## Status

Resend reports `studycircles.me` as verified. The domain is registered through
Namecheap. Custom SMTP is saved and remains enabled after reloading the shared
project's settings, using the Resend host and port below. On September 5, 2026,
Resend recorded the authorized signup test as Delivered from
`StudyCircle <noreply@studycircles.me>`. The user confirmed the personal test
worked, with the message arriving in Junk. Delivery is validated; inbox placement
is not guaranteed. An earlier resend to a missing account returned acceptance
without an email, demonstrating why provider and inbox evidence are required.

## Inbox placement follow-up

Resend's delivery report flagged missing DMARC and confirmation links using the
Supabase project domain. DNS lookup also found no `_dmarc.studycircles.me` record.
Add a TXT record at Namecheap with host `_dmarc`, value `v=DMARC1; p=none;`, and
automatic TTL. This initial policy enables DMARC without rejecting legitimate
mail. Do not create duplicate DMARC records. After validating all legitimate
senders, plan monitoring and a stricter policy. DNS changes are separate from
this repository and remain pending Namecheap access.

Development links still use Supabase and localhost. Keep the working Auth links
until an HTTPS deployment and appropriate domain configuration are available;
do not simply replace the link host. Resend also recommends a reply-capable
sender; configure an actual support inbox before claiming replies are monitored.
Mark the test email Not Junk in your mailbox. Authentication, consistent sending,
and domain reputation help delivery, but the receiving service controls placement.

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
   | Sender email | `noreply@studycircles.me` |
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

Automated coverage runs with `npm test` and does not send email. It checks
explicit send authorization, campus recipient validation, required confirmation,
rate-limit/provider failures without retries, and prevents HTTP acceptance from
being mistaken for delivery.

For an existing **unconfirmed** account you control, run in PowerShell:

```powershell
$env:EMAIL_TEST_TO = 'your-address@calpoly.edu'
npm run check:email -- --send
```

This sends at most one confirmation resend using the public Supabase key from
`.env.local`; no Resend key is needed locally. It does not create users or reset
passwords. Missing or already-confirmed accounts may return success without an
email, so an ACCEPTED result is only the first step. Match the send time,
recipient, and sender in Resend and check the mailbox before recording a pass.

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
