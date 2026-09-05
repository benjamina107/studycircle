# User-facing messages

- Explain what happened and the next useful action in plain language.
- Keep provider names, environment variables, database details, and raw exceptions out of user-visible responses. Technical setup guidance belongs in developer docs.
- Scope a failure to the operation: a failed profile save does not mean the whole app is unavailable.
- Do not claim a cause that is unknown. A connection failure is not proof that a confirmation link expired or a password is wrong.
- Do not claim email delivery, a completed logout, or a saved change unless the result supports it.
- Signup and confirmation requests must not reveal whether an email address has an account.
- Keep preview limitations visible: sample messages and meetups are not shared or saved. Explain that without implementation jargon.
- Announce errors as alerts and successful updates as status messages. Clear stale errors when retrying.

Run `npm run test:auth:smoke` with the local app running to check HTTP behavior and guard against technical details in tested error responses. This is not a substitute for real inbox and signed-in flow testing.
