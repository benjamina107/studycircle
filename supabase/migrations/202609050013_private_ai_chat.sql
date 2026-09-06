begin;
alter table public.study_messages add column private_owner_id uuid references public.profiles(id) on delete cascade;
alter table public.study_messages drop constraint study_messages_channel_check;
alter table public.study_messages add constraint study_messages_channel_check check(channel in ('general','homework','meetups','ai'));
alter table public.study_messages add constraint study_messages_private_owner_check check(
 (channel='ai' and private_owner_id is not null and (role='assistant' or author_id=private_owner_id))
 or (channel<>'ai' and private_owner_id is null));
drop policy study_messages_read on public.study_messages;
create policy study_messages_read on public.study_messages for select to authenticated using(
 public.is_subspace_member(subspace_id) and (private_owner_id is null or private_owner_id=auth.uid()));
create index study_messages_private_history on public.study_messages(subspace_id,private_owner_id,created_at desc) where channel='ai';
create or replace function public.kb_finish_question(question uuid, token uuid, answer jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare q public.study_messages; source jsonb;
begin
 select * into q from public.study_messages where id=question and lease_token=token and ai_status='processing' for update;
 if not found then return false; end if;
 if not public.kb_user_is_member(q.author_id,q.subspace_id) then
 update public.study_messages set ai_status='failed',error='Class access changed.',lease_token=null where id=question; return false;
 end if;
 for source in select * from jsonb_array_elements(coalesce(answer->'payload'->'sources','[]'::jsonb)) loop
  perform 1 from public.kb_uploads u join public.kb_chunks c on c.asset_id=u.asset_id
  where u.id=(source->>'uploadId')::uuid and c.id=(source->>'id')::uuid and u.subspace_id=q.subspace_id for key share of u,c;
  if not found then raise exception 'Source changed during generation'; end if;
 end loop;
 insert into public.study_messages(id,subspace_id,channel,role,body,payload,reply_to,private_owner_id)
 values(gen_random_uuid(),q.subspace_id,q.channel,'assistant',answer->>'body',answer->'payload',question,q.private_owner_id) on conflict(reply_to) do nothing;
 update public.study_messages set ai_status='done',lease_token=null,lease_until=null where id=question;
 return true;
end $$;
commit;
