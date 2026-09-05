import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('profile migration enforces campus identity, verification and ownership', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text,
        email_confirmed_at timestamptz, is_anonymous boolean default false,
        raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202609050001_initial.sql', import.meta.url), 'utf8'));
    const a = '00000000-0000-0000-0000-000000000001';
    const b = '00000000-0000-0000-0000-000000000002';
    const c = '00000000-0000-0000-0000-000000000003';
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
      ('${a}','a@calpoly.edu',now()), ('${b}','b@calpoly.edu',now());
      insert into auth.users(id,email,raw_user_meta_data) values
      ('${c}','c@calpoly.edu','{"email_verified":true}');`);
    assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n, 3);
    for (const email of ['x@gmail.com', 'x@calpoly.edu.evil.com', 'x@y@calpoly.edu', 'x@ calpoly.edu']) {
      await assert.rejects(db.query('insert into auth.users(id,email) values (gen_random_uuid(),$1)', [email]), /Cal Poly/);
    }
    await assert.rejects(db.exec(`insert into auth.users(id,email,is_anonymous) values (gen_random_uuid(),'anon@calpoly.edu',true)`), /Cal Poly/);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
    await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${c}',false)`);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    assert.equal((await db.query("update public.profiles set name='spoof' returning id")).rows.length, 0);
    await db.exec(`select set_config('request.jwt.claim.sub','${a}',false)`);
    assert.deepEqual((await db.query('select id from public.profiles')).rows, [{id:a}]);
    assert.equal((await db.query("update public.profiles set name='Student' where id=$1 returning name", [a])).rows[0].name, 'Student');
    assert.equal((await db.query("update public.profiles set name='Other' where id=$1 returning id", [b])).rows.length, 0);
    for (const sql of ["update public.profiles set email='other@calpoly.edu'", `update public.profiles set id='${b}'`, 'delete from public.profiles', `insert into public.profiles(id,email) values ('${a}','a@calpoly.edu')`]) {
      await assert.rejects(db.exec(sql), /permission denied/);
    }
    await db.exec('reset role');
    await assert.rejects(db.exec(`update auth.users set email='a@gmail.com' where id='${a}'`), /Cal Poly/);
    await db.exec(`update auth.users set email='new@calpoly.edu' where id='${a}'`);
    assert.equal((await db.query('select email from public.profiles where id=$1',[a])).rows[0].email,'new@calpoly.edu');
    await db.exec(`update auth.users set email_confirmed_at=null where id='${a}'; set role authenticated;`);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    await db.exec(`reset role; update auth.users set email_confirmed_at=now() where id='${c}'; set role authenticated; select set_config('request.jwt.claim.sub','${c}',false)`);
    assert.equal((await db.query('select id from public.profiles')).rows[0].id,c);
    await db.exec(`reset role; delete from auth.users where id='${a}'`);
    assert.equal((await db.query('select * from public.profiles where id=$1',[a])).rows.length,0);
  } finally { await db.close(); }
});
