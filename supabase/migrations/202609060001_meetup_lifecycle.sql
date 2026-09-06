-- Organizer lifecycle controls. Keep cancelled meetups visible to enrolled classmates,
-- while preventing any new attendance after cancellation or the start time.
begin;

alter table public.meetups add column if not exists cancelled_at timestamptz;
create index if not exists meetups_subspace_lifecycle_idx
  on public.meetups(subspace_id, cancelled_at, starts_at);

grant update(cancelled_at) on public.meetups to authenticated;

drop policy if exists join_meetup on public.meetup_attendees;
create policy join_meetup on public.meetup_attendees for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.meetups m
    where m.id = meetup_id
      and m.cancelled_at is null
      and m.starts_at > now()
      and public.is_subspace_member(m.subspace_id)
  )
);
commit;
