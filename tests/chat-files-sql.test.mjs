import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

for (const hardening of [false, true]) test(`chat file SQL isolates classes, verification, and identity (hardening=${hardening})`, async () => {
  const db = new PGlite();
  const a = '00000000-0000-0000-0000-000000000001';
  const b = '00000000-0000-0000-0000-000000000002';
  const f1 = '00000000-0000-4000-8000-000000000010';
  const f2 = '00000000-0000-4000-8000-000000000020';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
      grant all on storage.objects,storage.buckets to anon,authenticated;`);
    for (const file of ['202609050001_initial.sql', '202609050002_domain.sql', '202609050003_meetups.sql', '202609050012_repair_meetup_integrity.sql', '202609050010_class_files.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${a}','a@calpoly.edu',now()),('${b}','b@calpoly.edu',now());
      insert into courses(id,code,title,term) values ('c1','CSC202','CS','Fall'); insert into professors(id,name) values ('p1','One'),('p2','Two');
      insert into sections(id,course_id,professor_id,section_code,days) values ('s1','c1','p1','01','MWF'),('s2','c1','p2','02','MWF');
      insert into spaces(id,course_id) values ('sp1','c1');
      insert into subspaces(id,space_id,professor_id) values ('sub1','sp1','p1'),('sub2','sp1','p2');
      insert into channels(id,subspace_id,name) values ('ch1','sub1','general'),('ch2','sub2','general'),('legacy','sub1','other');
      insert into enrollments values ('${a}','s1'),('${b}','s2');
      insert into class_files(id,subspace_id,name,size,mime_type,uploader_id,object_path) values
        ('${f1}','sub1','Homework.pdf',100,'application/pdf','${a}','sub1/${a}/${f1}.pdf'),
        ('${f2}','sub2','Private.pdf',100,'application/pdf','${b}','sub2/${b}/${f2}.pdf');
      insert into messages(id,channel_id,author_id,body) values ('legacy-message','legacy','${a}','keep me');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202609050011_chat_files.sql', import.meta.url), 'utf8'));
    if (hardening) await db.exec(await readFile(new URL('../src/features/chat/pending-chat-hardening.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query("select count(*)::int as n from channels where name in ('general','homework')")).rows[0].n, 4);
    assert.equal((await db.query("select id from channels where subspace_id='sub1' and name='general'")).rows[0].id, 'ch1');
    assert.equal((await db.query("select body from messages where id='legacy-message'")).rows[0].body, 'keep me');
    await db.exec("insert into professors(id,name) values ('p3','Three'); insert into subspaces(id,space_id,professor_id) values ('future','sp1','p3')");
    assert.deepEqual((await db.query("select name from channels where subspace_id='future' order by name")).rows.map(r => r.name), ['general','homework']);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
    await db.exec(`insert into messages(id,channel_id,author_id,body,file_id) values ('m1','ch1','${a}','','${f1}')`);
    assert.equal((await db.query("select body from messages where id='m1'")).rows[0].body, 'Homework.pdf');
    assert.equal((await db.query('select * from class_files')).rows.length, 1);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body,file_id) values ('bad','ch1','${a}','foreign','${f2}')`), /File is unavailable/);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body,file_id) values ('bad','ch2','${a}','foreign','${f2}')`), /row-level security|enrolled/);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body,file_id) values ('bad','ch1','${b}','forged','${f1}')`), /row-level security|author/);
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
    assert.equal((await db.query('select * from messages')).rows.length, 0);
    await db.exec(`reset role; update auth.users set email_confirmed_at=null where id='${a}'; set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`);
    assert.equal((await db.query('select * from messages')).rows.length, 0);
    await assert.rejects(db.exec(`insert into messages(id,channel_id,author_id,body,file_id) values ('bad','ch1','${a}','unverified','${f1}')`), /row-level security|enrolled/);
    // Even trusted writes cannot link mismatched class files.
    await db.exec('reset role');
    await assert.rejects(db.exec(`update messages set file_id='${f2}' where id='m1'`), /File is unavailable/);
    await db.exec(`delete from class_files where id='${f1}'`);
    assert.equal((await db.query("select file_id from messages where id='m1'")).rows[0].file_id, null);
  } finally { await db.close(); }
});
