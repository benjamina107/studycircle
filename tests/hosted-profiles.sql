-- Run in Supabase SQL Editor as postgres. All fixture accounts are rolled back.
begin;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
('a0000000-0000-0000-0000-000000000001', 'rls-fixture-a@calpoly.edu', now(), '{}'),
('a0000000-0000-0000-0000-000000000002', 'rls-fixture-b@calpoly.edu', now(), '{}'),
('a0000000-0000-0000-0000-000000000003', 'rls-fixture-c@calpoly.edu', null, '{"email_verified":true}');
do $$ begin
  begin
    insert into auth.users(id,email) values (gen_random_uuid(),'fixture@calpoly.edu.evil.com');
    raise exception 'FAIL: invalid campus domain accepted';
  exception when check_violation then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform id from public.profiles;
    raise exception 'FAIL: anonymous read accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true);
do $$ begin
  if exists(select 1 from public.profiles) then raise exception 'FAIL: unverified read'; end if;
  update public.profiles set name='not allowed' where id='a0000000-0000-0000-0000-000000000003';
  if found then raise exception 'FAIL: unverified update'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001',true);
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: owner visibility'; end if;
  update public.profiles set name='Allowed' where id='a0000000-0000-0000-0000-000000000001';
  if not found then raise exception 'FAIL: owner update'; end if;
  update public.profiles set name='Forbidden' where id='a0000000-0000-0000-0000-000000000002';
  if found then raise exception 'FAIL: cross-user update'; end if;
  begin
    update public.profiles set email='spoof@calpoly.edu' where id='a0000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: identity update accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: hosted profile policies; fixtures rolled back' as result;
