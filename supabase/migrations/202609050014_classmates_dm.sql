begin;
create table public.class_direct_messages (
 id uuid primary key, subspace_id text not null references public.subspaces(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now(), read_at timestamptz,
 check(sender_id<>recipient_id)
);
create index class_dm_conversation on public.class_direct_messages(subspace_id,sender_id,recipient_id,created_at desc);
create index class_dm_unread on public.class_direct_messages(recipient_id,subspace_id) where read_at is null;
alter table public.class_direct_messages enable row level security;
revoke all on public.class_direct_messages from public,anon,authenticated;
grant select on public.class_direct_messages to authenticated;
grant all on public.class_direct_messages to service_role;
create policy class_dm_participants on public.class_direct_messages for select to authenticated using(
 (sender_id=auth.uid() or recipient_id=auth.uid()) and public.is_subspace_member(subspace_id));
create function public.classmates(target text) returns table(id uuid,name text,major text,avatar_url text,unread bigint,last_message text,last_at timestamptz)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.major,p.avatar_url,
 (select count(*) from public.class_direct_messages d where d.subspace_id=target and d.sender_id=p.id and d.recipient_id=auth.uid() and d.read_at is null),
 recent.body,recent.created_at
 from public.profiles p
 left join lateral(select d.body,d.created_at from public.class_direct_messages d where d.subspace_id=target and ((d.sender_id=auth.uid() and d.recipient_id=p.id) or (d.sender_id=p.id and d.recipient_id=auth.uid())) order by d.created_at desc,d.id desc limit 1) recent on true
 where public.is_subspace_member(target) and exists(
 select 1 from public.enrollments e join public.sections s on s.id=e.section_id join public.spaces sp on sp.course_id=s.course_id join public.subspaces sub on sub.space_id=sp.id and sub.professor_id=s.professor_id
 where e.user_id=p.id and sub.id=target)
 order by p.name nulls last,p.id;
$$;
revoke all on function public.classmates(text) from public,anon;
grant execute on function public.classmates(text) to authenticated;
commit;
