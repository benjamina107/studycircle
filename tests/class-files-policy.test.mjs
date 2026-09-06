import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('class files isolate course AND professor, constrain metadata, and protect private storage', async () => {
  const db = new PGlite();
  const a = '00000000-0000-0000-0000-000000000001';
  const peer = '00000000-0000-0000-0000-000000000002';
  const otherProfessor = '00000000-0000-0000-0000-000000000003';
  const otherCourse = '00000000-0000-0000-0000-000000000004';
  const unverified = '00000000-0000-0000-0000-000000000005';
  const id = '11111111-1111-4111-8111-111111111111';
  const orphanId = '22222222-2222-4222-8222-222222222222';
  const path = `sub1/${a}/${id}.pdf`;
  const orphan = `sub1/${a}/${orphanId}.txt`;
  const login = async (uid) => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false)`);
  const insertFile = (overrides = {}) => {
    const row = { id, name: 'notes.pdf', size: 5, mime_type: 'application/pdf', uploader_id: a, subspace_id: 'sub1', object_path: path, ...overrides };
    return db.query(`insert into public.class_files (${Object.keys(row).join(',')}) values (${Object.keys(row).map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(row));
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
      grant all on storage.objects,storage.buckets to anon,authenticated;
      -- Simulate a project's dangerously broad policies: our restrictive guards must still win.
      create policy broad_objects on storage.objects for all to anon,authenticated using (true) with check (true);
      create policy broad_buckets on storage.buckets for all to anon,authenticated using (true) with check (true);
      insert into storage.buckets values ('class-files','class-files',true,null,null);`);
    for (const file of ['202609050001_initial.sql', '202609050002_domain.sql', '202609050003_meetups.sql', '202609050010_class_files.sql', '202609050011_chat_files.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    const bucket = (await db.query("select * from storage.buckets where id='class-files'")).rows[0];
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 10485760);
    assert.deepEqual(bucket.allowed_mime_types, ['application/pdf','image/png','image/jpeg','text/plain','text/csv']);
    const idTypes = (await db.query("select table_name,column_name,data_type from information_schema.columns where table_schema='public' and ((table_name='class_files' and column_name='id') or (table_name='messages' and column_name='file_id'))")).rows;
    assert.equal(idTypes.length,2);
    assert.ok(idTypes.every(column => column.data_type==='uuid'), '004/005 attachment key types agree');
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
      ('${a}','a@calpoly.edu',now()),('${peer}','b@calpoly.edu',now()),('${otherProfessor}','c@calpoly.edu',now()),
      ('${otherCourse}','d@calpoly.edu',now()),('${unverified}','e@calpoly.edu',null);
      insert into courses(id,code,title,term) values ('c1','CSC202','CS','Fall'),('c2','CSC203','CS2','Fall');
      insert into professors(id,name) values ('p1','One'),('p2','Two');
      insert into sections(id,course_id,professor_id,section_code,days) values
       ('s1','c1','p1','01','M'),('s1b','c1','p1','02','W'),('s2','c1','p2','03','M'),('s3','c2','p1','01','M');
      insert into spaces(id,course_id) values ('sp1','c1'),('sp2','c2');
      insert into subspaces(id,space_id,professor_id) values ('sub1','sp1','p1'),('sub2','sp1','p2'),('sub3','sp2','p1');
      insert into enrollments values ('${a}','s1'),('${peer}','s1b'),('${otherProfessor}','s2'),('${otherCourse}','s3'),('${unverified}','s1');`);
    await login(a);
    await assert.rejects(insertFile(), /row-level security/, 'metadata requires an uploaded object');
    for (const invalid of [`sub2/${a}/${id}.pdf`, `sub3/${a}/${id}.pdf`, `sub1/${peer}/${id}.pdf`, `sub1/${a}/../${id}.pdf`, `sub1/${a}/${id}.html`]) {
      await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values ('class-files',$1,$2)", [invalid,a]), /row-level security/);
    }
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values ('class-files',$1,$2)", [path,peer]), /row-level security/);
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('class-files',$1,$2,$3)", [path,a,{ size: 5, mimetype: 'application/pdf' }]);
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values ('class-files',$1,$2,$3)", [orphan,a,{ size: 4, mimetype: 'text/plain' }]);
    for (const override of [{size: 6}, {uploader_id: peer}, {subspace_id:'sub2'}, {object_path: orphan}, {mime_type:'text/plain'}]) {
      await assert.rejects(insertFile(override), /row-level security|check constraint/);
    }
    for (const override of [{name:'../notes.pdf'}, {name:'notes\\bad.pdf'}, {name:'notes\n.pdf'}, {name:'a'.repeat(181)+'.pdf'}, {name:'notes.exe'}, {size:0}, {size:10485761}]) {
      await assert.rejects(insertFile(override), /row-level security|check constraint/);
    }
    await assert.rejects(insertFile({created_at:'2020-01-01'}), /permission denied/);
    const saved = (await insertFile()).rows[0];
    assert.equal(saved.object_path, path);
    await db.query("insert into public.messages(channel_id,author_id,body,file_id) select id,$1,'',$2 from public.channels where subspace_id='sub1' and name='general'",[a,id]);
    assert.equal((await db.query('select body from public.messages where file_id=$1',[id])).rows[0].body,'notes.pdf','005 accepts uploaded file and supplies the filename');
    await assert.rejects(db.exec("update public.class_files set name='forged.pdf'"), /permission denied/);
    await assert.rejects(db.exec('delete from public.class_files'), /permission denied/);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning *", [path])).rows.length, 0, 'registered objects cannot be removed');
    assert.equal((await db.query("update storage.objects set name='moved' returning *")).rows.length, 0, 'objects cannot be moved/overwritten');
    assert.equal((await db.query("update storage.buckets set public=true where id='class-files' returning *")).rows.length, 0);
    assert.equal((await db.query("delete from storage.buckets where id='class-files' returning *")).rows.length, 0);

    await login(peer);
    assert.equal((await db.query('select * from public.class_files')).rows.length, 1, 'same course/professor across sections');
    assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r => r.name), [path], 'peers cannot read pending uploads');
    assert.equal((await db.query('delete from storage.objects returning *')).rows.length, 0);
    for (const uid of [otherProfessor, otherCourse, unverified]) {
      await login(uid);
      assert.equal((await db.query('select * from public.class_files')).rows.length, 0);
      assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
      await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values ('class-files',$1,$2)", [`sub1/${uid}/${id}.pdf`,uid]), /row-level security/);
      if (uid===otherProfessor) await assert.rejects(db.query("insert into public.messages(channel_id,author_id,body,file_id) select id,$1,'wrong class',$2 from public.channels where subspace_id='sub2' and name='general'",[uid,id]), /unavailable|row-level security/i);
    }
    await login(a);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning *', [orphan])).rows.length, 1, 'pending object cleanup succeeds');
    await db.exec(`delete from enrollments where user_id='${a}'`);
    assert.equal((await db.query('select * from public.class_files')).rows.length, 0);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0, 'uploader loses downloads on leaving');
    assert.equal((await db.query('delete from storage.objects returning *')).rows.length, 0, 'leaving cannot enable deletion of registered objects');
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.class_files'), /permission denied/);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values ('class-files',$1,$2)", [orphan,a]), /row-level security/);
  } finally { await db.close(); }
});
