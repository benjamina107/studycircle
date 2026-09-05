-- Issue #1: profiles only. Apply to the shared development project once.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email ~* '^[^@[:space:]]+@calpoly[.]edu$'),
  name text not null default '',
  major text not null default '',
  interests text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, major, interests, avatar_url) on public.profiles to authenticated;

-- Read authoritative Auth data, never user-editable JWT metadata.
create function public.is_verified_calpoly_user()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and email_confirmed_at is not null
      and email ~* '^[^@[:space:]]+@calpoly[.]edu$'
      and coalesce(is_anonymous, false) = false
  );
$$;
revoke all on function public.is_verified_calpoly_user() from public, anon;
grant execute on function public.is_verified_calpoly_user() to authenticated;

create policy profiles_select_own_verified on public.profiles
for select to authenticated
using (id = (select auth.uid()) and (select public.is_verified_calpoly_user()));
create policy profiles_update_own_verified on public.profiles
for update to authenticated
using (id = (select auth.uid()) and (select public.is_verified_calpoly_user()))
with check (id = (select auth.uid()) and (select public.is_verified_calpoly_user()));

create function public.enforce_calpoly_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null or new.email !~* '^[^@[:space:]]+@calpoly[.]edu$'
     or coalesce(new.is_anonymous, false) then
    raise exception 'A Cal Poly email address is required' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_calpoly_signup() from public, anon, authenticated;
create trigger enforce_calpoly_signup
before insert or update of email, is_anonymous on auth.users
for each row execute function public.enforce_calpoly_signup();

create function public.sync_auth_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;
revoke all on function public.sync_auth_profile() from public, anon, authenticated;
create trigger sync_auth_profile
after insert or update of email on auth.users
for each row execute function public.sync_auth_profile();

create function public.touch_profile()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.touch_profile() from public, anon, authenticated;
create trigger touch_profile before update on public.profiles
for each row execute function public.touch_profile();

-- Backfill eligible existing accounts without granting unverified accounts access.
insert into public.profiles (id, email, name)
select id, email, coalesce(raw_user_meta_data ->> 'name', '') from auth.users
where email ~* '^[^@[:space:]]+@calpoly[.]edu$' and not coalesce(is_anonymous, false);

commit;
