-- Complete application schema. Auth owns users and verification tokens.
begin;
create table public.courses (
 id text primary key default gen_random_uuid()::text,
 code text not null, title text not null, term text not null, unique(code,term)
);
create table public.professors (
 id text primary key default gen_random_uuid()::text, name text not null
);
create table public.sections (
 id text primary key default gen_random_uuid()::text,
 course_id text not null references public.courses(id),
 professor_id text not null references public.professors(id),
 section_code text not null, days text not null,
 start_time text, end_time text, location text, unique(course_id,section_code)
);
create table public.enrollments (
 user_id uuid not null references public.profiles(id) on delete cascade,
 section_id text not null references public.sections(id), primary key(user_id,section_id)
);
create table public.spaces (
 id text primary key default gen_random_uuid()::text,
 course_id text not null unique references public.courses(id)
);
create table public.subspaces (
 id text primary key default gen_random_uuid()::text,
 space_id text not null references public.spaces(id),
 professor_id text not null references public.professors(id), unique(space_id,professor_id)
);
create table public.channels (
 id text primary key default gen_random_uuid()::text,
 subspace_id text not null references public.subspaces(id), name text not null,
 unique(subspace_id,name)
);
create table public.meetups (
 id text primary key default gen_random_uuid()::text,
 subspace_id text not null references public.subspaces(id),
 creator_id uuid not null references public.profiles(id),
 title text not null, blurb text, location_name text not null,
 lat double precision, lng double precision, starts_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.meetup_attendees (
 meetup_id text not null references public.meetups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(meetup_id,user_id)
);
create table public.messages (
 id text primary key default gen_random_uuid()::text,
 channel_id text not null references public.channels(id),
 author_id uuid references public.profiles(id), body text not null,
 is_ai_response boolean not null default false,
 meetup_id text references public.meetups(id) on delete set null,
 created_at timestamptz not null default now()
);
create table public.lecture_folders (
 id text primary key default gen_random_uuid()::text,
 subspace_id text not null references public.subspaces(id), date timestamptz not null,
 title text, unique(subspace_id,date)
);
create table public.notes (
 id text primary key default gen_random_uuid()::text,
 lecture_folder_id text not null references public.lecture_folders(id),
 uploader_id uuid not null references public.profiles(id),
 file_name text not null, file_url text not null, mime_type text not null,
 created_at timestamptz not null default now()
);
create table public.lecture_summaries (
 id text primary key default gen_random_uuid()::text,
 lecture_folder_id text not null unique references public.lecture_folders(id),
 content text not null, generated_at timestamptz not null default now()
);
create table public.course_schedules (
 id text primary key default gen_random_uuid()::text,
 subspace_id text not null unique references public.subspaces(id),
 raw_file_url text, uploaded_at timestamptz not null default now()
);
create table public.schedule_items (
 id text primary key default gen_random_uuid()::text,
 schedule_id text not null references public.course_schedules(id),
 type text not null, title text not null, date timestamptz not null,
 is_cumulative boolean, topics text
);
create table public.notification_settings (
 user_id uuid not null references public.profiles(id) on delete cascade,
 event text not null, email_enabled boolean not null default true,
 primary key(user_id,event)
);

-- Membership is derived from course AND professor, across that professor's sections.
create function public.is_subspace_member(target text)
returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_verified_calpoly_user() and exists (
  select 1 from public.enrollments e
  join public.sections s on s.id=e.section_id
  join public.spaces sp on sp.course_id=s.course_id
  join public.subspaces sub on sub.space_id=sp.id and sub.professor_id=s.professor_id
  where e.user_id=(select auth.uid()) and sub.id=target
 );
$$;
revoke all on function public.is_subspace_member(text) from public,anon;
grant execute on function public.is_subspace_member(text) to authenticated;

alter table public.courses enable row level security;
alter table public.professors enable row level security;
alter table public.sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.spaces enable row level security;
alter table public.subspaces enable row level security;
alter table public.channels enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_attendees enable row level security;
alter table public.messages enable row level security;
alter table public.lecture_folders enable row level security;
alter table public.notes enable row level security;
alter table public.lecture_summaries enable row level security;
alter table public.course_schedules enable row level security;
alter table public.schedule_items enable row level security;
alter table public.notification_settings enable row level security;

-- Default deny; catalog and generated content are provisioned by trusted server code.
do $$ declare t text; begin
 foreach t in array array['courses','professors','sections','enrollments','spaces',
 'subspaces','channels','meetups','meetup_attendees','messages','lecture_folders',
 'notes','lecture_summaries','course_schedules','schedule_items','notification_settings'] loop

  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['courses','professors','sections','spaces','subspaces'] loop
  execute format('create policy verified_catalog on public.%I for select to authenticated using ((select public.is_verified_calpoly_user()))',t);
 end loop;
end $$;
grant insert,delete on public.enrollments to authenticated;
create policy own_enrollments on public.enrollments for all to authenticated
 using (user_id=(select auth.uid()) and (select public.is_verified_calpoly_user()))
 with check (user_id=(select auth.uid()) and (select public.is_verified_calpoly_user()));
create policy member_channels on public.channels for select to authenticated using(public.is_subspace_member(subspace_id));
create policy member_meetups on public.meetups for select to authenticated using(public.is_subspace_member(subspace_id));
grant insert,delete on public.meetups to authenticated;
grant update(title,blurb,location_name,lat,lng,starts_at) on public.meetups to authenticated;
create policy own_meetups on public.meetups for all to authenticated
 using(creator_id=(select auth.uid()) and public.is_subspace_member(subspace_id))
 with check(creator_id=(select auth.uid()) and public.is_subspace_member(subspace_id));
create policy member_messages on public.messages for select to authenticated
 using(exists(select 1 from public.channels c where c.id=channel_id));
grant insert,delete on public.messages to authenticated;
grant update(body) on public.messages to authenticated;
create policy write_messages on public.messages for all to authenticated
 using(author_id=(select auth.uid()) and not is_ai_response and exists(select 1 from public.channels c where c.id=channel_id))
 with check(author_id=(select auth.uid()) and not is_ai_response and exists(
 select 1 from public.channels c where c.id=channel_id and (meetup_id is null or exists(
 select 1 from public.meetups m where m.id=meetup_id and m.subspace_id=c.subspace_id))));
create policy member_attendees on public.meetup_attendees for select to authenticated
 using(exists(select 1 from public.meetups m where m.id=meetup_id));
grant insert,delete on public.meetup_attendees to authenticated;
create policy join_meetup on public.meetup_attendees for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.meetups m where m.id=meetup_id));
create policy leave_or_remove_attendee on public.meetup_attendees for delete to authenticated
 using((select public.is_verified_calpoly_user()) and (user_id=(select auth.uid()) or exists(
 select 1 from public.meetups m where m.id=meetup_id and m.creator_id=(select auth.uid()))));
create policy member_folders on public.lecture_folders for select to authenticated using(public.is_subspace_member(subspace_id));
create policy member_notes on public.notes for select to authenticated
 using(exists(select 1 from public.lecture_folders f where f.id=lecture_folder_id));
grant insert,delete on public.notes to authenticated;
grant update(file_name) on public.notes to authenticated;
create policy own_notes on public.notes for all to authenticated
 using(uploader_id=(select auth.uid()) and exists(select 1 from public.lecture_folders f where f.id=lecture_folder_id))
 with check(uploader_id=(select auth.uid()) and exists(select 1 from public.lecture_folders f where f.id=lecture_folder_id));
create policy member_summaries on public.lecture_summaries for select to authenticated
 using(exists(select 1 from public.lecture_folders f where f.id=lecture_folder_id));
create policy member_schedules on public.course_schedules for select to authenticated using(public.is_subspace_member(subspace_id));
create policy member_schedule_items on public.schedule_items for select to authenticated
 using(exists(select 1 from public.course_schedules s where s.id=schedule_id));
grant update(type,title,date,is_cumulative,topics) on public.schedule_items to authenticated;
create policy edit_member_schedule on public.schedule_items for update to authenticated
 using(exists(select 1 from public.course_schedules s where s.id=schedule_id))
 with check(exists(select 1 from public.course_schedules s where s.id=schedule_id));
grant insert,delete on public.notification_settings to authenticated;
grant update(email_enabled) on public.notification_settings to authenticated;
create policy own_notifications on public.notification_settings for all to authenticated
 using(user_id=(select auth.uid()) and (select public.is_verified_calpoly_user()))
 with check(user_id=(select auth.uid()) and (select public.is_verified_calpoly_user()));

-- Index referencing columns for membership checks and relationship lookups.
create index sections_professor_idx on public.sections(professor_id);
create index enrollments_section_idx on public.enrollments(section_id);
create index subspaces_professor_idx on public.subspaces(professor_id);
create index meetups_subspace_idx on public.meetups(subspace_id);
create index meetups_creator_idx on public.meetups(creator_id);
create index attendees_user_idx on public.meetup_attendees(user_id);
create index messages_channel_idx on public.messages(channel_id);
create index messages_author_idx on public.messages(author_id);
create index messages_meetup_idx on public.messages(meetup_id);
create index notes_folder_idx on public.notes(lecture_folder_id);
create index notes_uploader_idx on public.notes(uploader_id);
create index schedule_items_schedule_idx on public.schedule_items(schedule_id);
commit;
