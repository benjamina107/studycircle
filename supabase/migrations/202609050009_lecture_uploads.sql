-- Lecture folders and notes are private to enrolled classmates.
begin;

create table public.term_teaching_periods (
  term text primary key,
  starts_on date not null,
  ends_on date not null,
  excluded_dates date[] not null default '{}',
  check (ends_on >= starts_on)
);
insert into public.term_teaching_periods (term, starts_on, ends_on, excluded_dates)
values ('Fall 2026', '2026-08-24', '2026-12-11', array['2026-09-07'::date, '2026-11-11'::date, '2026-11-23'::date, '2026-11-24'::date, '2026-11-25'::date, '2026-11-26'::date, '2026-11-27'::date])
on conflict (term) do update set starts_on = excluded.starts_on, ends_on = excluded.ends_on, excluded_dates = excluded.excluded_dates;
alter table public.term_teaching_periods enable row level security;
revoke all on public.term_teaching_periods from public, anon, authenticated;
grant select on public.term_teaching_periods to authenticated;
create policy verified_teaching_periods on public.term_teaching_periods for select to authenticated using ((select public.is_verified_calpoly_user()));

create function public.generate_lecture_folders(target_subspace_id text)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  if not public.is_subspace_member(target_subspace_id) then
    raise exception 'Class membership is required' using errcode = '42501';
  end if;
  with target as (
    select sub.id, c.id as course_id, sub.professor_id, period.starts_on, period.ends_on, period.excluded_dates
    from public.subspaces sub
    join public.spaces space on space.id = sub.space_id
    join public.courses c on c.id = space.course_id
    join public.term_teaching_periods period on period.term = c.term
    where sub.id = target_subspace_id
  ), teaching_days as (
    select distinct day::date as date
    from target, public.sections section, generate_series(target.starts_on, target.ends_on, interval '1 day') day
    where section.course_id = target.course_id and section.professor_id = target.professor_id
      and not (day::date = any(target.excluded_dates))
      and case extract(isodow from day)
        when 1 then position('M' in section.days) > 0
        when 2 then position('T' in section.days) > 0
        when 3 then position('W' in section.days) > 0
        when 4 then position('R' in section.days) > 0
        when 5 then position('F' in section.days) > 0
        when 6 then position('S' in section.days) > 0
        when 7 then position('U' in section.days) > 0
        else false end
  ), inserted as (
    insert into public.lecture_folders (subspace_id, date, title)
    select target_subspace_id, (date::timestamp at time zone 'America/Los_Angeles'), 'Lecture · ' || to_char(date, 'Mon FMDD')
    from teaching_days
    on conflict (subspace_id, date) do nothing
    returning id
  ) select count(*) into inserted_count from inserted;
  return inserted_count;
end;
$$;
revoke all on function public.generate_lecture_folders(text) from public, anon;
grant execute on function public.generate_lecture_folders(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lecture-notes', 'lecture-notes', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create policy lecture_note_files_read on storage.objects for select to authenticated
using (bucket_id = 'lecture-notes' and exists (
  select 1 from public.notes note join public.lecture_folders folder on folder.id = note.lecture_folder_id
  where note.file_url = name and public.is_subspace_member(folder.subspace_id)
));
create policy lecture_note_files_upload on storage.objects for insert to authenticated
with check (bucket_id = 'lecture-notes' and split_part(name, '/', 2) = (select auth.uid())::text and exists (
  select 1 from public.lecture_folders folder
  where folder.id = split_part(name, '/', 1) and public.is_subspace_member(folder.subspace_id)
));

-- Retention/deletion is intentionally not exposed until a product policy is agreed.
commit;
