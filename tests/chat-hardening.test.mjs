import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('chat hardening enforces membership, identity, timestamps, links, and limits', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    for (const file of ['202609050001_initial.sql', '202609050002_domain.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../src/features/chat/pending-chat-hardening.sql', import.meta.url), 'utf8'));
    const a = '00000000-0000-0000-0000-000000000001';
    const b = '00000000-0000-0000-0000-000000000002';
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${a}','a@calpoly.edu',now()),('${b}','b@calpoly.edu',now());
      insert into courses(id,code,title,term) values ('c1','CSC202','CS','Fall'); insert into professors(id,name) values ('p1','One');
      insert into sections(id,course_id,professor_id,section_code,days) values ('s1','c1','p1','01','MWF'); insert into spaces(id,course_id) values ('sp1','c1');
      insert into subspaces(id,space_id,professor_id) values ('sub1','sp1','p1'); insert into channels(id,subspace_id,name) values ('ch1','sub1','general');
      insert into enrollments values ('${a}','s1'); set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
    await db.exec(`insert into messages(id,channel_id,author_id,body,created_at) values ('m1','ch1','${a}','  hello  ','2000-01-01');`);
    const message = (await db.query("select body,created_at from messages where id='m1'")).rows[0];
    assert.equal(message.body, 'hello');
    assert.notEqual(String(message.created_at).slice(0, 4), '2000');
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body) values ('m2','ch1','${b}','forged')`), /row-level security|author/);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body,meetup_id) values ('m3','ch1','${a}','unrelated','missing')`), /row-level security|meetup/);
    for (let i = 2; i <= 10; i++) await db.exec(`insert into messages(id,channel_id,author_id,body) values ('m${i}','ch1','${a}','message ${i}')`);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body) values ('m11','ch1','${a}','too many')`), /Posting limit/);
  } catch (error) { console.error(error); throw error; }
  finally { await db.close(); }
});
