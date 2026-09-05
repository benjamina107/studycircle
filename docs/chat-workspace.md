# Chat workspace

Chats starts with the student's enrolled course/professor groups. Opening a class
shows General, Homework, and Meetups. Exam prep and the redundant subpage tabs,
overview cards, and General-channel meetup pin were removed.

Meetups contains invite cards sourced from that group's meetup records (latest
100 by start time). RSVP uses the same authenticated action as the feed. The
channel UI does not create database channel records or migrate existing channels.

Messages and attachments remain local previews, explicitly labelled. Files may
be attached in any of the three channels. Shared media lists the current class's
attachments across channels, with their originating channel and download link.
Leaving or reloading clears local messages/files. Browser object URLs are released
when the workspace unmounts. No files are uploaded to an external service.

Allowed files: JPG, PNG, WebP, PDF, and plain text, up to 10 MB per file, 5 files per
message, and 30 files / 50 MB per preview session. HTML, SVG, and executable types
are rejected. Production uploads still need server-side validation, private storage
policies, durable attachment metadata, and shared message delivery. Client validation
alone is not a production upload security boundary.

Public sample: `/preview/chat`. Real enrolled groups: `/chats` (requires login).
The sample is not evidence of real message delivery or uploaded media persistence.
