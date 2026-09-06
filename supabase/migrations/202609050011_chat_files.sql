-- Apply after 006 class_files. Independent of pending-chat-hardening.sql;
-- restrictive policies remain effective alongside its permissive policies.
begin;
-- Trusted provisioning keeps every current and future group ready for the Chat tab.
create function public.provision_class_chat_channels()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.channels(subspace_id, name) values (new.id, 'general'), (new.id, 'homework')
    on conflict (subspace_id, name) do nothing;
  return new;
end;
$$;
revoke all on function public.provision_class_chat_channels() from public, anon, authenticated;
create trigger provision_class_chat_channels after insert on public.subspaces
for each row execute function public.provision_class_chat_channels();
insert into public.channels(subspace_id, name)
select s.id, channel.name from public.subspaces s
cross join (values ('general'), ('homework')) as channel(name)
on conflict (subspace_id, name) do nothing;

alter table public.messages add column file_id uuid references public.class_files(id) on delete set null;
create index messages_file_id_idx on public.messages(file_id) where file_id is not null;
grant insert(file_id) on public.messages to authenticated;

create policy class_chat_read_guard on public.messages as restrictive for select to authenticated
using (public.is_verified_calpoly_user() and exists (
  select 1 from public.channels c where c.id = channel_id and public.is_subspace_member(c.subspace_id)
));
create policy class_chat_write_guard on public.messages as restrictive for insert to authenticated
with check (author_id = (select auth.uid()) and not is_ai_response
  and public.is_verified_calpoly_user() and exists (
    select 1 from public.channels c where c.id = channel_id and public.is_subspace_member(c.subspace_id)
      and (file_id is null or exists (
        select 1 from public.class_files f where f.id = file_id and f.subspace_id = c.subspace_id
      ))
  ));

create function public.check_class_chat_file()
returns trigger language plpgsql security definer set search_path = '' as $$
declare attachment_name text;
begin
  if new.file_id is not null then
    select f.name into attachment_name from public.class_files f
      join public.channels c on c.subspace_id = f.subspace_id
      where f.id = new.file_id and c.id = new.channel_id;
    if not found then raise exception 'File is unavailable in this class' using errcode = '42501'; end if;
    if btrim(coalesce(new.body, '')) = '' then new.body := attachment_name; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.check_class_chat_file() from public, anon, authenticated;
-- Alphabetically before check_chat_message, so file-only text passes its body check.
create trigger check_00_class_chat_file before insert or update on public.messages
for each row execute function public.check_class_chat_file();
commit;
