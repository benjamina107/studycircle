import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

test('onboarding migration backfills only safe legacy profiles and protects completion updates', async () => {
  const db = new PGlite();
  const ids = ['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000e'];
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    await db.exec(await migration('202609050001_initial.sql'));
    await db.exec(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
      ('${ids[0]}','valid@calpoly.edu',now(),'{}'),('${ids[1]}','blank@calpoly.edu',now(),'{}'),('${ids[2]}','major@calpoly.edu',now(),'{}'),('${ids[3]}','url@calpoly.edu',now(),'{}'),('${ids[4]}','credential@calpoly.edu',now(),'{}');`);
    await db.exec('set role authenticated');
    for (const [id, update] of [[ids[0], "name='Valid Student',major='Computer Science',interests='Hiking',avatar_url='https://example.com/me.png'"], [ids[1], "name='',major='',interests='',avatar_url=null"], [ids[2], `name='Too Major',major='${'x'.repeat(121)}'`], [ids[3], "name='Bad URL',avatar_url='https:///'"], [ids[4], "name='Credential URL',avatar_url='https://user:pass@example.com/x'"]]) {
      await db.exec(`select set_config('request.jwt.claim.sub','${id}',false); update public.profiles set ${update} where id='${id}';`);
    }
    await db.exec('reset role');
    await db.exec(await migration('202609050016_profile_onboarding.sql'));
    const rows = await db.query('select id,onboarding_completed_at from public.profiles order by id');
    assert.equal(rows.rows.find((row) => row.id === ids[0]).onboarding_completed_at !== null, true);
    for (const id of ids.slice(1)) assert.equal(rows.rows.find((row) => row.id === id).onboarding_completed_at, null);

    const newId = '00000000-0000-0000-0000-00000000000f';
    await db.exec(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ('${newId}','new@calpoly.edu',now(),'{"name":"Signup Name"}');`);
    assert.equal((await db.query('select onboarding_completed_at from public.profiles where id=$1',[newId])).rows[0].onboarding_completed_at, null);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${newId}',false);`);
    await assert.rejects(db.query(`update public.profiles set name=null,onboarding_completed_at=now() where id='${newId}'`));
    assert.equal((await db.query('select onboarding_completed_at from public.profiles where id=$1',[newId])).rows[0].onboarding_completed_at, null);
    assert.equal((await db.query(`update public.profiles set name='Completed',onboarding_completed_at=now() where id='${newId}' returning id`)).rows.length, 1);
    const completedAt = (await db.query('select onboarding_completed_at from public.profiles where id=$1',[newId])).rows[0].onboarding_completed_at;
    await db.query(`update public.profiles set name='Edited Later' where id='${newId}'`);
    assert.deepEqual((await db.query('select onboarding_completed_at from public.profiles where id=$1',[newId])).rows[0].onboarding_completed_at, completedAt);
    assert.equal((await db.query(`update public.profiles set name='Spoofed' where id='${ids[0]}' returning id`)).rows.length, 0);
    await db.exec(`reset role; update auth.users set email_confirmed_at=null where id='${newId}'; set role authenticated; select set_config('request.jwt.claim.sub','${newId}',false);`);
    assert.equal((await db.query(`update public.profiles set name='Unverified' where id='${newId}' returning id`)).rows.length, 0);
  } finally { await db.close(); }
});
