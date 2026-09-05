# Meetup feed and profile enrollment

The Feed tab replaces the course directory at `/spaces`. Upcoming meetups appear
in start-time order across every enrolled course/professor group. Past posts are
available separately. Results are paginated in groups of 20; the feed does not
duplicate a post when multiple enrolled sections share a professor.

Profile contains course-code search and section selection. Each catalog section
identifies a course, term, and professor. Enrollment changes update the signed-in
student's records and refresh the feed. Search returns up to 100 matching sections.
An empty catalog is explained rather than filled with fictional courses.

RSVP and cancellation use the authenticated user's identity, never a submitted
user ID. Database access policies restrict meetup reads and attendance writes to
the relevant course/professor membership. Duplicate joins are idempotent. The app
closes RSVP actions after the start time and does not let hosts RSVP to their own
post. These time/host checks are application rules, not new database constraints.

Removing an enrollment does not cancel existing RSVPs. The profile explains that
students should cancel first if needed; another section with the same course and
professor still provides membership. No hosted schema or data was changed as part
of implementation. Catalog import and publishing real meetup posts remain
separate features.

## Checks

- `npm run test:feed`: validation and action tests with mocked server boundaries.
- `npm test`: existing PostgreSQL schema and course/professor isolation tests.
- `npm run test:auth:smoke`: signed-out route protection and request validation.
- Development-only layout preview: `/preview/workspace?view=feed`.

Still verify with a signed-in test account and a populated catalog: add/remove
sections, confirm cross-professor isolation in the browser, RSVP/cancel, refresh
to check persistence, and exercise pagination. No test account or shared meetup
was created during these automated checks.
