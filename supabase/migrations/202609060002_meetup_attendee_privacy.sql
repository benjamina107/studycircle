-- Attendance itself is private class data. The original policy only checked
-- that a meetup existed, which allowed another authenticated user with a
-- guessed ID to read its attendee rows or remove their own stale RSVP.
begin;

drop policy if exists member_attendees on public.meetup_attendees;
create policy member_attendees on public.meetup_attendees for select to authenticated
using (
  exists (
    select 1 from public.meetups m
    where m.id = meetup_id
      and public.is_subspace_member(m.subspace_id)
  )
);

drop policy if exists leave_or_remove_attendee on public.meetup_attendees;
create policy leave_or_remove_attendee on public.meetup_attendees for delete to authenticated
using (
  public.is_verified_calpoly_user()
  and exists (
    select 1 from public.meetups m
    where m.id = meetup_id
      and public.is_subspace_member(m.subspace_id)
      and (user_id = (select auth.uid()) or m.creator_id = (select auth.uid()))
  )
);
commit;
