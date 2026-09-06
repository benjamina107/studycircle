begin;
grant usage on schema extensions to authenticated,service_role;
-- Use lexical OR so conversational requests still match labels such as HW 3.
create or replace function public.kb_search(target text, query_embedding extensions.vector(1536), query_text text, result_limit int default 60)
returns table(id uuid,asset_id uuid,content text,locator text,score double precision)
language sql stable security invoker set search_path='' as $$
 select c.id,c.asset_id,c.content,c.locator,
 (1-(c.embedding operator(extensions.<=>) query_embedding)) +
 least(0.25,ts_rank_cd(to_tsvector('english',c.content),websearch_to_tsquery('english',array_to_string(tsvector_to_array(to_tsvector('english',left(query_text,1000))),' OR '))))::double precision +
 coalesce((select max(least(0.3,ts_rank_cd(to_tsvector('english',u.description||' '||u.file_name),websearch_to_tsquery('english',array_to_string(tsvector_to_array(to_tsvector('english',left(query_text,1000))),' OR '))))) from public.kb_uploads u where u.asset_id=a.id),0)::double precision as score
 from public.kb_chunks c join public.kb_assets a on a.id=c.asset_id
 where a.subspace_id=target and a.status='ready' and exists(select 1 from public.kb_uploads u where u.asset_id=a.id)
 order by score desc limit least(greatest(result_limit,1),100);
$$;
-- Validate citation ownership and existence in the same transaction that publishes the answer.
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
 insert into public.study_messages(id,subspace_id,channel,role,body,payload,reply_to)
 values(gen_random_uuid(),q.subspace_id,q.channel,'assistant',answer->>'body',answer->'payload',question) on conflict(reply_to) do nothing;
 update public.study_messages set ai_status='done',lease_token=null,lease_until=null where id=question;
 return true;
end $$;
commit;
