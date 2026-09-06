begin;
create extension if not exists vector with schema extensions;
create table public.kb_assets (
 id uuid primary key default gen_random_uuid(), subspace_id text not null references public.subspaces(id),
 sha256 text not null check(length(sha256)=64), mime_type text not null,
 status text not null default 'queued' check(status in ('queued','processing','ready','failed')),
 attempts int not null default 0, available_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, error text, created_at timestamptz not null default now(),
 unique(subspace_id,sha256), unique(id,subspace_id)
);
create table public.kb_uploads (
 id uuid primary key, asset_id uuid not null, subspace_id text not null,
 uploader_id uuid not null references public.profiles(id), contribution_id uuid not null,
 file_name text not null check(length(file_name) between 1 and 200), object_path text not null unique,
 byte_size integer not null check(byte_size between 1 and 25000000), description text not null default '' check(length(description)<=1000),
 created_at timestamptz not null default now(),
 foreign key(asset_id,subspace_id) references public.kb_assets(id,subspace_id) on delete cascade
);
create index kb_uploads_class on public.kb_uploads(subspace_id,created_at desc);
create index kb_uploads_asset on public.kb_uploads(asset_id);
create table public.kb_chunks (
 id uuid primary key default gen_random_uuid(), asset_id uuid not null references public.kb_assets(id) on delete cascade,
 ordinal int not null, content text not null check(length(content) between 1 and 4000), locator text not null,
 embedding extensions.vector(1536) not null, unique(asset_id,ordinal)
);
create table public.study_messages (
 id uuid primary key, subspace_id text not null references public.subspaces(id),
 channel text not null check(channel in ('general','homework','meetups')),
 author_id uuid references public.profiles(id), role text not null check(role in ('user','assistant')),
 body text not null check(length(body) between 1 and 16000), payload jsonb,
 reply_to uuid unique references public.study_messages(id) on delete cascade,
 ai_status text not null default 'none' check(ai_status in ('none','queued','processing','done','failed')),
 attempts int not null default 0, lease_token uuid, lease_until timestamptz, available_at timestamptz not null default now(),
 error text, created_at timestamptz not null default now(),
 check((role='user' and author_id is not null and reply_to is null) or (role='assistant' and author_id is null and reply_to is not null))
);
create index study_messages_class on public.study_messages(subspace_id,channel,created_at desc);
create table public.kb_garbage (object_path text primary key, created_at timestamptz not null default now());
create table public.kb_quotas (user_id uuid not null, operation text not null, window_start timestamptz not null, count int not null, primary key(user_id,operation));

alter table public.kb_assets enable row level security;
alter table public.kb_uploads enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.study_messages enable row level security;
alter table public.kb_garbage enable row level security;
alter table public.kb_quotas enable row level security;
revoke all on public.kb_assets,public.kb_uploads,public.kb_chunks,public.study_messages,public.kb_garbage,public.kb_quotas from public,anon,authenticated;
grant select on public.kb_assets,public.kb_uploads,public.kb_chunks,public.study_messages to authenticated;
grant all on public.kb_assets,public.kb_uploads,public.kb_chunks,public.study_messages,public.kb_garbage,public.kb_quotas to service_role;
create policy kb_assets_read on public.kb_assets for select to authenticated using(public.is_subspace_member(subspace_id));
create policy kb_uploads_read on public.kb_uploads for select to authenticated using(public.is_subspace_member(subspace_id));
create policy kb_chunks_read on public.kb_chunks for select to authenticated using(exists(select 1 from public.kb_assets a where a.id=asset_id and a.status='ready'));
create policy study_messages_read on public.study_messages for select to authenticated using(public.is_subspace_member(subspace_id));

-- Membership rechecked by background jobs, including account verification.
create function public.kb_user_is_member(who uuid, target text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.enrollments e on e.user_id=u.id
 join public.sections s on s.id=e.section_id join public.spaces sp on sp.course_id=s.course_id
 join public.subspaces sub on sub.space_id=sp.id and sub.professor_id=s.professor_id
 where u.id=who and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and u.email ~* '^[^@\s]+@calpoly\.edu$' and sub.id=target);
$$;

-- Atomic deduplication: uploads sharing bytes reuse one processing job, but keep their own files and descriptions.
create function public.kb_attach_upload(p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare asset uuid;
begin
 if not public.kb_user_is_member((p->>'uploader_id')::uuid,p->>'subspace_id') then raise exception 'Membership required'; end if;
 insert into public.kb_assets(subspace_id,sha256,mime_type) values(p->>'subspace_id',p->>'sha256',p->>'mime_type')
 on conflict(subspace_id,sha256) do update set sha256=excluded.sha256 returning id into asset;
 insert into public.kb_uploads(id,asset_id,subspace_id,uploader_id,contribution_id,file_name,object_path,byte_size,description)
 values((p->>'id')::uuid,asset,p->>'subspace_id',(p->>'uploader_id')::uuid,(p->>'contribution_id')::uuid,p->>'file_name',p->>'object_path',(p->>'byte_size')::int,p->>'description');
 return asset;
end $$;
create function public.kb_remove_upload(upload_id uuid, who uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare asset uuid; removed uuid;
begin
 select asset_id into asset from public.kb_uploads where id=upload_id and uploader_id=who;
 if asset is null then return false; end if;
 perform 1 from public.kb_assets where id=asset for update;
 delete from public.kb_uploads where id=upload_id and uploader_id=who returning id into removed;
 if not exists(select 1 from public.kb_uploads where asset_id=asset) then delete from public.kb_assets where id=asset; end if;
 return removed is not null;
end $$;
create function public.kb_queue_file_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.kb_garbage(object_path) values(old.object_path) on conflict do nothing; return old; end $$;
create trigger kb_cleanup after delete on public.kb_uploads for each row execute function public.kb_queue_file_cleanup();

create function public.kb_claim_asset() returns setof public.kb_assets language sql security definer set search_path='' as $$
 update public.kb_assets set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '20 minutes',error=null
 where id=(select id from public.kb_assets where (status='queued' and available_at<=now()) or (status='processing' and lease_until<now()) order by created_at for update skip locked limit 1) returning *;
$$;
create function public.kb_finish_asset(asset uuid, token uuid, passages jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.kb_assets where id=asset and lease_token=token and status='processing' for update;
 if not found then return false; end if;
 if jsonb_array_length(passages)=0 then raise exception 'Empty extraction'; end if;
 delete from public.kb_chunks where asset_id=asset;
 insert into public.kb_chunks(asset_id,ordinal,content,locator,embedding)
 select asset,(x->>'ordinal')::int,x->>'content',x->>'locator',(x->>'embedding')::extensions.vector from jsonb_array_elements(passages) x;
 update public.kb_assets set status='ready',lease_token=null,lease_until=null,error=null where id=asset;
 return true;
end $$;
create function public.kb_claim_question() returns setof public.study_messages language sql security definer set search_path='' as $$
 update public.study_messages set ai_status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',error=null
 where id=(select id from public.study_messages where role='user' and ((ai_status='queued' and available_at<=now()) or (ai_status='processing' and lease_until<now())) order by created_at for update skip locked limit 1) returning *;
$$;
create function public.kb_finish_question(question uuid, token uuid, answer jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare q public.study_messages;
begin
 select * into q from public.study_messages where id=question and lease_token=token and ai_status='processing' for update;
 if not found then return false; end if;
 if not public.kb_user_is_member(q.author_id,q.subspace_id) then
 update public.study_messages set ai_status='failed',error='Class access changed.',lease_token=null where id=question; return false;
 end if;
 insert into public.study_messages(id,subspace_id,channel,role,body,payload,reply_to)
 values(gen_random_uuid(),q.subspace_id,q.channel,'assistant',answer->>'body',answer->'payload',question) on conflict(reply_to) do nothing;
 update public.study_messages set ai_status='done',lease_token=null,lease_until=null where id=question;
 return true;
end $$;
create function public.kb_search(target text, query_embedding extensions.vector(1536), query_text text, result_limit int default 60)
returns table(id uuid,asset_id uuid,content text,locator text,score double precision)
language sql stable security invoker set search_path='' as $$
 select c.id,c.asset_id,c.content,c.locator,
 (1-(c.embedding operator(extensions.<=>) query_embedding)) +
 least(0.25,ts_rank_cd(to_tsvector('english',c.content),plainto_tsquery('english',left(query_text,1000))))::double precision as score
 from public.kb_chunks c join public.kb_assets a on a.id=c.asset_id
 where a.subspace_id=target and a.status='ready' and exists(select 1 from public.kb_uploads u where u.asset_id=a.id)
 order by score desc limit least(greatest(result_limit,1),100);
$$;
create function public.kb_take_quota(who uuid, action text, max_count int) returns boolean language plpgsql security definer set search_path='' as $$
declare total int;
begin
 insert into public.kb_quotas(user_id,operation,window_start,count) values(who,action,date_trunc('minute',now()),1)
 on conflict(user_id,operation) do update set window_start=date_trunc('minute',now()),count=case when kb_quotas.window_start=date_trunc('minute',now()) then kb_quotas.count+1 else 1 end returning count into total;
 return total<=max_count;
end $$;
-- All mutation helpers are server-only; browser calls cannot forge identities or AI messages.
do $$ declare f text; begin
 foreach f in array array['kb_user_is_member(uuid,text)','kb_attach_upload(jsonb)','kb_remove_upload(uuid,uuid)','kb_queue_file_cleanup()','kb_claim_asset()','kb_finish_asset(uuid,uuid,jsonb)','kb_claim_question()','kb_finish_question(uuid,uuid,jsonb)','kb_take_quota(uuid,text,int)'] loop
 execute 'revoke all on function public.'||f||' from public,anon,authenticated';
 execute 'grant execute on function public.'||f||' to service_role';
 end loop;
end $$;
revoke all on function public.kb_search(text,extensions.vector,text,int) from public,anon;
grant execute on function public.kb_search(text,extensions.vector,text,int) to authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit) values('class-notes','class-notes',false,25000000);
-- No browser storage policies: authenticated application endpoints authorize every upload/download.
commit;
