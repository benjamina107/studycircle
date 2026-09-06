-- Local migration only. Storage must already be installed by Supabase.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('class-files', 'class-files', false, 10485760,
 array['application/pdf','image/png','image/jpeg','text/plain','text/csv'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
 allowed_mime_types = excluded.allowed_mime_types;

create table public.class_files (
 id uuid primary key default gen_random_uuid()
  check (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 name text not null check (char_length(name) between 1 and 180 and name = btrim(name)
  and name !~ '[[:cntrl:]/\\]' and left(name,1) <> '.'
  and name !~ U&'[\202A-\202E\2066-\2069]'),
 size bigint not null check (size between 1 and 10485760),
 mime_type text not null,
 created_at timestamptz not null default now(),
 uploader_id uuid not null references public.profiles(id),
 subspace_id text not null references public.subspaces(id)
  check (subspace_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 object_path text not null unique,
 constraint class_files_type check (
  (mime_type = 'application/pdf' and lower(name) ~ '\.pdf$') or
  (mime_type = 'image/png' and lower(name) ~ '\.png$') or
  (mime_type = 'image/jpeg' and lower(name) ~ '\.jpe?g$') or
  (mime_type = 'text/plain' and lower(name) ~ '\.txt$') or
  (mime_type = 'text/csv' and lower(name) ~ '\.csv$')
 ),
 constraint class_files_path check (
  object_path = subspace_id || '/' || uploader_id::text || '/' || id::text || '.' ||
   lower(substring(name from '\.([^.]+)$'))
 )
);
create index class_files_subspace_created_idx on public.class_files(subspace_id, created_at desc, id desc);
create index class_files_uploader_idx on public.class_files(uploader_id);
alter table public.class_files enable row level security;
revoke all on public.class_files from public, anon, authenticated;
grant select on public.class_files to authenticated;
-- Clients cannot forge creation timestamps or mutate a published file's identity/content.
grant insert(id, name, size, mime_type, uploader_id, subspace_id, object_path) on public.class_files to authenticated;

create policy class_files_member_read on public.class_files for select to authenticated
 using (public.is_subspace_member(subspace_id));
create policy class_files_member_insert on public.class_files for insert to authenticated
 with check (
  uploader_id = (select auth.uid()) and public.is_subspace_member(subspace_id)
  and exists (select 1 from storage.objects o where o.bucket_id = 'class-files'
   and o.name = class_files.object_path and o.owner_id = (select auth.uid())::text
   and o.metadata->>'size' = class_files.size::text and o.metadata->>'mimetype' = class_files.mime_type)
 );

-- No caller-supplied filenames appear in object paths. Avoid UUID casts on untrusted paths.
create function public.class_file_upload_path(path text, object_owner text)
returns boolean language sql stable security invoker set search_path = '' as $$
 select object_owner = (select auth.uid())::text
  and path ~ '^[A-Za-z0-9_-]{1,128}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|png|jpg|jpeg|txt|csv)$'
  and split_part(path, '/', 2) = (select auth.uid())::text
  and public.is_subspace_member(split_part(path, '/', 1));
$$;
revoke all on function public.class_file_upload_path(text,text) from public,anon;
grant execute on function public.class_file_upload_path(text,text) to authenticated;

-- Restrictive guards prevent unrelated permissive Storage policies from opening this bucket.
create policy class_files_storage_anon_guard on storage.objects as restrictive for all to anon
 using (bucket_id <> 'class-files') with check (bucket_id <> 'class-files');
create policy class_files_storage_insert_guard on storage.objects as restrictive for insert to authenticated
 with check (bucket_id <> 'class-files' or public.class_file_upload_path(name,owner_id));
create policy class_files_storage_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'class-files' and public.class_file_upload_path(name,owner_id));

-- Owners can see their pending objects for cleanup; peers only see registered files.
create policy class_files_storage_read_guard on storage.objects as restrictive for select to authenticated
 using (bucket_id <> 'class-files' or (
  public.is_subspace_member(split_part(name,'/',1)) and (
   public.class_file_upload_path(name,owner_id) or exists (
    select 1 from public.class_files f where f.object_path = storage.objects.name
     and f.subspace_id = split_part(storage.objects.name,'/',1)
   )
  )
 ));
create policy class_files_storage_read on storage.objects for select to authenticated
 using (bucket_id = 'class-files');

-- Published objects are immutable. Only an uploader's unregistered object can be cleaned up.
create policy class_files_storage_delete_guard on storage.objects as restrictive for delete to authenticated
 using (bucket_id <> 'class-files' or (
  public.class_file_upload_path(name,owner_id) and not exists (
   select 1 from public.class_files f where f.object_path = storage.objects.name
  )
 ));
create policy class_files_storage_delete on storage.objects for delete to authenticated
 using (bucket_id = 'class-files');
create policy class_files_storage_update_guard on storage.objects as restrictive for update to authenticated
 using (bucket_id <> 'class-files') with check (bucket_id <> 'class-files');

-- Even projects with broad bucket policies cannot let end users make this bucket public.
create policy class_files_bucket_insert_guard on storage.buckets as restrictive for insert to anon,authenticated
 with check (id <> 'class-files');
create policy class_files_bucket_update_guard on storage.buckets as restrictive for update to anon,authenticated
 using (id <> 'class-files') with check (id <> 'class-files');
create policy class_files_bucket_delete_guard on storage.buckets as restrictive for delete to anon,authenticated
 using (id <> 'class-files');

commit;
