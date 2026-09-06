import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('private AI questions and answers are visible only to their owner, with class access',async()=>{
 const db=new PGlite();
 const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select current_setting('request.jwt.claim.sub')::uuid$$;
 create table profiles(id uuid primary key);insert into profiles values('${a}'),('${b}');
 create table subspaces(id text primary key);insert into subspaces values('class');
 create function public.is_subspace_member(text) returns boolean language sql stable as $$select current_setting('test.member',true)='yes'$$;
 create function public.kb_user_is_member(uuid,text) returns boolean language sql stable as $$select true$$;`);
 const original=await readFile('supabase/migrations/202609050005_knowledge.sql','utf8');
 await db.exec(original.slice(original.indexOf('create table public.study_messages'),original.indexOf('create table public.kb_garbage')));
 await db.exec(`alter table study_messages enable row level security;grant usage on schema auth to authenticated;grant select on study_messages to authenticated;create policy study_messages_read on study_messages for select to authenticated using(public.is_subspace_member(subspace_id));`);
 await db.exec(await readFile('supabase/migrations/202609050013_private_ai_chat.sql','utf8'));
 await db.exec(`insert into study_messages(id,subspace_id,channel,role,author_id,body,private_owner_id,ai_status,lease_token) values
 ('10000000-0000-0000-0000-000000000001','class','ai','user','${a}','private a','${a}','processing','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002','class','ai','user','${b}','private b','${b}','none',null),
 ('10000000-0000-0000-0000-000000000003','class','general','user','${a}','public',null,'none',null);`);
 // Empty source list exercises answer publication and inherited ownership.
 await db.exec(`select kb_finish_question('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','{"body":"reply a","payload":{"sources":[],"cards":[]}}');`);
 for(const [user,bodies] of [[a,['private a','public','reply a']],[b,['private b','public']]]){
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);select set_config('test.member','yes',false);`);
 assert.deepEqual((await db.query('select body from study_messages order by body')).rows.map(r=>r.body),bodies);
 await db.exec('reset role');
 }
 await db.exec(`set role authenticated;select set_config('test.member','no',false);`);
 assert.equal((await db.query('select * from study_messages')).rows.length,0);
 await db.exec('reset role');
 await assert.rejects(db.exec(`insert into study_messages(id,subspace_id,channel,role,author_id,body) values(gen_random_uuid(),'class','ai','user','${a}','no owner')`),/private_owner_check/);
 }finally{await db.close();}
});
