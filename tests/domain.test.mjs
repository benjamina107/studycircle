import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('complete schema preserves relationships and isolates course/professor data', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['202609050001_initial.sql','202609050002_domain.sql']) {
   await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  }
  const tables = (await db.query("select tablename,rowsecurity from pg_tables where schemaname='public'")).rows;
  assert.equal(tables.length,17);
  assert.ok(tables.every(t=>t.rowsecurity));
  const contract = JSON.parse(await readFile(new URL('./schema-contract.json',import.meta.url),'utf8'));
  const columns = (await db.query("select table_name,column_name,data_type from information_schema.columns where table_schema='public'")).rows;
  for (const [table,fields] of Object.entries(contract)) for (const [field,type] of Object.entries(fields)) {
   assert.equal(columns.find(c=>c.table_name===table && c.column_name===field)?.data_type,type,`${table}.${field}`);
  }
  const a='00000000-0000-0000-0000-000000000001';
  const b='00000000-0000-0000-0000-000000000002';
  const u='00000000-0000-0000-0000-000000000003';
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
   ('${a}','a@calpoly.edu',now()),('${b}','b@calpoly.edu',now()),('${u}','u@calpoly.edu',null);
   insert into courses(id,code,title,term) values ('c1','CSC202','CS','Fall'),('c2','CSC203','CS2','Fall');
   insert into professors(id,name) values ('p1','One'),('p2','Two');
   insert into sections(id,course_id,professor_id,section_code,days) values ('s1','c1','p1','01','MWF'),('s2','c1','p2','02','MWF'),('s3','c2','p1','01','MWF');
   insert into spaces(id,course_id) values ('sp1','c1'),('sp2','c2');
   insert into subspaces(id,space_id,professor_id) values ('sub1','sp1','p1'),('sub2','sp1','p2'),('sub3','sp2','p1');
   insert into channels(id,subspace_id,name) values ('ch1','sub1','general'),('ch2','sub2','general'),('ch3','sub3','general');
   insert into enrollments values ('${a}','s1'),('${b}','s2');
   insert into lecture_folders(id,subspace_id,date) values ('f1','sub1',now()),('f2','sub2',now());
   insert into notes(id,lecture_folder_id,uploader_id,file_name,file_url,mime_type) values ('n1','f1','${a}','notes.pdf','sub1/notes.pdf','application/pdf'),('n2','f2','${b}','notes.pdf','sub2/notes.pdf','application/pdf');
   insert into lecture_summaries(id,lecture_folder_id,content) values ('sum1','f1','Summary'),('sum2','f2','Other');
   insert into course_schedules(id,subspace_id) values ('sc1','sub1'),('sc2','sub2');
   insert into schedule_items(id,schedule_id,type,title,date) values ('item1','sc1','EXAM','Exam',now()),('item2','sc2','EXAM','Exam',now());
   insert into meetups(id,subspace_id,creator_id,title,location_name,starts_at) values ('m1','sub1','${a}','Study','Library',now()),('m2','sub2','${b}','Study','Library',now());
   insert into messages(id,channel_id,author_id,body) values ('msg1','ch1','${a}','Hello'),('msg2','ch2','${b}','Private');`);
  await assert.rejects(db.exec("insert into sections(course_id,professor_id,section_code,days) values ('missing','p1','99','M')"),/foreign key/);
  await assert.rejects(db.exec("insert into courses(code,title,term) values ('CSC202','Duplicate','Fall')"),/unique/);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u}',false)`);
  for (const t of tables) assert.equal((await db.query(`select * from public.${t.tablename}`)).rows.length,0,t.tablename);
  await db.exec(`select set_config('request.jwt.claim.sub','${a}',false)`);
  assert.equal((await db.query('select * from courses')).rows.length,2);
  for (const t of ['channels','meetups','messages','notes','lecture_folders','lecture_summaries','course_schedules','schedule_items']) {
   assert.equal((await db.query(`select * from ${t}`)).rows.length,1,t);
  }
  await assert.rejects(db.exec(`insert into messages(channel_id,author_id,body) values ('ch2','${a}','No')`),/row-level security/);
  await assert.rejects(db.exec(`insert into messages(channel_id,author_id,body,is_ai_response) values ('ch1','${a}','Spoof AI',true)`),/row-level security/);
  await assert.rejects(db.exec(`insert into messages(channel_id,author_id,body,meetup_id) values ('ch1','${a}','Wrong pin','m2')`),/row-level security/);
  await db.exec(`insert into messages(channel_id,author_id,body,meetup_id) values ('ch1','${a}','Valid','m1'); insert into meetup_attendees(meetup_id,user_id) values ('m1','${a}')`);
  await assert.rejects(db.exec(`insert into meetup_attendees(meetup_id,user_id) values ('m2','${a}')`),/row-level security/);
  await assert.rejects(db.exec(`insert into enrollments values ('${b}','s1')`),/row-level security/);
  await assert.rejects(db.exec("insert into channels(subspace_id,name) values ('sub1','user-created')"),/permission denied/);
  await assert.rejects(db.exec(`insert into notes(lecture_folder_id,uploader_id,file_name,file_url,mime_type) values ('f2','${a}','x','x','x')`),/row-level security/);
  await db.exec(`insert into notification_settings(user_id,event) values ('${a}','MENTION')`);
  await assert.rejects(db.exec(`insert into notification_settings(user_id,event) values ('${b}','MENTION')`),/row-level security/);
  await db.exec(`delete from enrollments where user_id='${a}' and section_id='s1'`);
  assert.equal((await db.query('select * from notes')).rows.length,0,'Access revoked after unenrollment');
  await db.exec('reset role; set role anon');
  for(const t of tables) await assert.rejects(db.query(`select * from public.${t.tablename}`),/permission denied/);
 } finally {await db.close();}
});
