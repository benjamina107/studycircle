-- Issue #4: meetup integrity belongs in the database, not just the UI.
begin;

alter table public.meetups
  add column time_zone text not null default 'America/Los_Angeles';
alter table public.meetups
  alter column time_zone drop default;

create index meetups_subspace_starts_idx on public.meetups(subspace_id, starts_at);
create index meetups_creator_created_idx on public.meetups(creator_id, created_at);

create function public.validate_meetup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if btrim(new.title) = '' or char_length(new.title) > 100 then
    raise exception 'Meetup title must be between 1 and 100 characters' using errcode = '22023';
  end if;
  if btrim(new.location_name) = '' or char_length(new.location_name) > 140 then
    raise exception 'Meetup location must be between 1 and 140 characters' using errcode = '22023';
  end if;
  if new.blurb is not null and char_length(new.blurb) > 500 then
    raise exception 'Meetup blurb must be 500 characters or fewer' using errcode = '22023';
  end if;
  if new.starts_at <= now() then
    raise exception 'Meetups must start in the future' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Meetup time zone must be an IANA time zone' using errcode = '22023';
  end if;
  if (new.lat is null) <> (new.lng is null)
     or (new.lat is not null and (new.lat < -90 or new.lat > 90 or new.lng < -180 or new.lng > 180)) then
    raise exception 'Meetup map pin is invalid' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and (new.creator_id <> old.creator_id or new.subspace_id <> old.subspace_id) then
    raise exception 'Meetup creator and class cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_meetup() from public, anon, authenticated;

create function public.enforce_meetup_post_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize posts per creator, so concurrent requests cannot pass the count together.
  perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text, 4));
  if (select count(*) from public.meetups
      where creator_id = new.creator_id
        and created_at >= date_trunc('day', now())
        and created_at < date_trunc('day', now()) + interval '1 day') >= 5 then
    raise exception 'You can create at most 5 meetups per day' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_meetup_post_limit() from public, anon, authenticated;

create function public.add_meetup_creator_as_attendee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.meetup_attendees(meetup_id, user_id)
  values (new.id, new.creator_id)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.add_meetup_creator_as_attendee() from public, anon, authenticated;

create trigger validate_meetup before insert or update on public.meetups
for each row execute function public.validate_meetup();
create trigger enforce_meetup_post_limit before insert on public.meetups
for each row execute function public.enforce_meetup_post_limit();
create trigger add_meetup_creator_as_attendee after insert on public.meetups
for each row execute function public.add_meetup_creator_as_attendee();

-- Tighten the original policies so joins always require membership in the same professor's class.
drop policy join_meetup on public.meetup_attendees;
create policy join_meetup on public.meetup_attendees for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.meetups m
    where m.id = meetup_id and public.is_subspace_member(m.subspace_id)
  )
);

grant update(time_zone) on public.meetups to authenticated;
commit;
