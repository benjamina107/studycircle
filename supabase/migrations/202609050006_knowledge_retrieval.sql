begin;
grant usage on schema extensions to authenticated,service_role;
-- Include optional descriptions in retrieval without treating them as facts or duplicating embeddings.
create or replace function public.kb_search(target text, query_embedding extensions.vector(1536), query_text text, result_limit int default 60)
returns table(id uuid,asset_id uuid,content text,locator text,score double precision)
language sql stable security invoker set search_path='' as $$
 select c.id,c.asset_id,c.content,c.locator,
 (1-(c.embedding operator(extensions.<=>) query_embedding)) +
 least(0.25,ts_rank_cd(to_tsvector('english',c.content),plainto_tsquery('english',left(query_text,1000))))::double precision +
 coalesce((select max(least(0.3,ts_rank_cd(to_tsvector('english',u.description||' '||u.file_name),plainto_tsquery('english',left(query_text,1000))))) from public.kb_uploads u where u.asset_id=a.id),0)::double precision as score
 from public.kb_chunks c join public.kb_assets a on a.id=c.asset_id
 where a.subspace_id=target and a.status='ready' and exists(select 1 from public.kb_uploads u where u.asset_id=a.id)
 order by score desc limit least(greatest(result_limit,1),100);
$$;
commit;
