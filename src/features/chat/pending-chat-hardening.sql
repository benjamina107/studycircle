-- Chat-specific hardening. Catalog/channel ownership remains provisioned by trusted code.
begin;

create table public.message_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  message_count integer not null default 0 check (message_count >= 0)
);
alter table public.message_rate_limits enable row level security;
revoke all on public.message_rate_limits from public, anon, authenticated;
create index messages_channel_created_idx on public.messages(channel_id, created_at desc, id desc);

-- Keep the user-facing path bounded while retaining a trusted server path for AI/system writers.
create or replace function public.check_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  bucket timestamptz := date_trunc('minute', clock_timestamp());
  updated_count integer;
begin
  -- A trusted service role may write system/AI messages. End users cannot forge this JWT role.
  if coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role')) = 'service_role' then
    new.created_at := clock_timestamp();
    return new;
  end if;
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if new.author_id is distinct from (select auth.uid()) then raise exception 'Message author is fixed to the signed-in user' using errcode = '42501'; end if;
  if new.is_ai_response then raise exception 'AI messages are not accepted on the user chat path' using errcode = '42501'; end if;
  new.body := btrim(new.body);
  if char_length(new.body) < 1 or char_length(new.body) > 2000 then raise exception 'Message body must be between 1 and 2,000 characters' using errcode = '22023'; end if;
  if not exists (select 1 from public.channels c where c.id = new.channel_id and public.is_subspace_member(c.subspace_id)) then
    raise exception 'You are not enrolled in this channel' using errcode = '42501';
  end if;
  if new.meetup_id is not null and not exists (
    select 1 from public.meetups m where m.id = new.meetup_id
      and exists (select 1 from public.channels c where c.id = new.channel_id and c.subspace_id = m.subspace_id)
  ) then raise exception 'The meetup does not belong to this channel' using errcode = '42501'; end if;
  new.created_at := clock_timestamp();

  insert into public.message_rate_limits(user_id, window_start, message_count)
  values ((select auth.uid()), bucket, 1)
  on conflict (user_id) do update
    set window_start = case when public.message_rate_limits.window_start < bucket then bucket else public.message_rate_limits.window_start end,
        message_count = case when public.message_rate_limits.window_start < bucket then 1 else public.message_rate_limits.message_count + 1 end
    where public.message_rate_limits.window_start < bucket or public.message_rate_limits.message_count < 10
  returning message_count into updated_count;
  if updated_count is null or updated_count > 10 then raise exception 'Posting limit reached. Try again in a minute.' using errcode = '42900'; end if;
  return new;
end;
$$;
revoke all on function public.check_chat_message() from public, anon, authenticated;

drop trigger if exists check_chat_message on public.messages;
create trigger check_chat_message before insert on public.messages
for each row execute function public.check_chat_message();

drop policy if exists member_messages on public.messages;
create policy member_messages on public.messages for select to authenticated
using (exists(select 1 from public.channels c where c.id=channel_id and public.is_subspace_member(c.subspace_id)));

drop policy if exists write_messages on public.messages;
create policy write_messages on public.messages for insert to authenticated
with check (author_id=(select auth.uid()) and not is_ai_response and exists(
 select 1 from public.channels c where c.id=channel_id and public.is_subspace_member(c.subspace_id)
));

-- User chat does not edit or delete durable messages, which keeps idempotency and limits meaningful.
revoke update(body), delete on public.messages from authenticated;

commit;
