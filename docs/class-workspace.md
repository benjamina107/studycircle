# Class workspace

The app opens one enrolled **course + professor group** at a time. A fixed bottom bar contains **Meetups**, **Chat**, and **Files**, with space below the page content for the bar and mobile safe area. The class selector stays at the top. Its **+** button opens a catalog search by course and/or professor to add an existing section; it never creates catalog entries. Profile is in the top-right corner, with a confirmed **Leave class** action for each enrolled section. Other enrolled sections in the same course/professor group retain access; leaving does not cancel existing RSVPs.

## Navigation

- `/spaces` opens the last visited enrolled group in Meetups, or the first group sorted by course code/professor if the preference is absent or no longer accessible.
- `/chats` opens that group in Chat.
- The class dropdown keeps the current tab when switching groups. The header always derives the active class from the route, not a stale preference.
- A validated, account-specific HTTP-only cookie remembers the group for 180 days on this browser. It is not cross-device storage.
- Old class Lectures URLs redirect to Files. Explicit invalid course/professor pairings return an unavailable page.
- A student with no enrolled classes is directed to Profile. No fictional classes or sample messages appear on authenticated routes.

## Features and deployment

Meetups reads and creates class-specific sessions, including RSVP. Chat contains General and Homework. Files is a private class repository; sending an uploaded file in Chat also registers it in Files.

Before live verification, the team's Supabase project needs the existing migrations 001–003 and the new migrations **004 class_files**, then **005 chat_files**. Apply only missing versions, in order, after review; do not reset the shared database or reapply old migrations. This implementation does not deploy them automatically.

See [Meetups](class-meetups.md), [Chat](class-chat.md), and [Files](class-files.md) for contracts, restrictions, and tests. The private bucket is not internet-public: downloads require current class membership before a short-lived download URL is issued. Downloaded copies cannot be revoked.

## Review checklist

1. Sign in with a verified campus account and choose course sections in Profile.
2. Switch course/professor groups, reload, and confirm the remembered group; remove its last enrolled section and check the fallback.
3. Create a future meetup; RSVP and cancel with a second enrolled account.
4. Send text and a file in both chat channels, then download that file from Files with another member.
5. Confirm an unrelated course or professor member cannot list files, download them, post chat, or RSVP.
6. Check the dropdown, tabs, forms, and download controls on mobile and with a keyboard.

Development-only `/preview/workspace` and `/preview/chat` provide sample layout review without bypassing authentication or writing real data. Preview interactions are not end-to-end backend tests.

## Brand

The supplied logo is preserved at `public/brand/studycircle-original.png`. The shared BrandMark component adds clear space. Browser and Apple icons use square canvases with approximately 14% padding on each side, preserving the artwork's aspect ratio.
