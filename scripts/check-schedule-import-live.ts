// Creates one disposable verified account; never changes an existing user's enrollments.
import {config} from 'dotenv';config({path:'.env.local',quiet:true});
import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {adminClient,checked} from '../src/lib/knowledge/admin';import type {ClassMatch} from '../src/lib/onboarding/matching';
async function main(){
 if(process.argv[2]!=='--run'||!process.argv[3])throw new Error('Usage: tsx scripts/check-schedule-import-live.ts --run <schedule.png>');
 const db=adminClient(),origin='http://127.0.0.1:3000',endpoint=origin+'/api/onboarding/classes';
 const email=`schedule-check-${randomUUID()}@calpoly.edu`,password=randomUUID()+'Aa1!';let userId='';
 try{
  const created=await db.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;userId=created.data.user.id;
  checked(await db.from('profiles').update({name:'Schedule Import Test',onboarding_completed_at:null}).eq('id',userId));
  const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const request=(method:string,body:BodyInit,originValue=origin)=>fetch(endpoint,{method,headers:{Origin:originValue,Cookie:cookie,...(typeof body==='string'?{'Content-Type':'application/json'}:{})},body});
  assert.equal((await fetch(endpoint,{method:'POST',headers:{Origin:origin}})).status,401);
  assert.equal((await request('PATCH',JSON.stringify({sectionIds:[]}),'https://untrusted.example')).status,403);
  const bad=new FormData();bad.append('screenshots',new File(['not an image'],'fake.png',{type:'image/png'}));assert.equal((await request('POST',bad)).status,400);
  const form=new FormData();form.append('screenshots',new File([await readFile(process.argv[3])],'schedule.png',{type:'image/png'}));
  const upload=await request('POST',form);const parsed=await upload.json();assert.equal(upload.status,200,JSON.stringify(parsed));
  const matches=parsed.matches as ClassMatch[];assert.ok(matches.length>0);const ids=matches.map(m=>m.selected).filter(Boolean);assert.ok(ids.length>0);
  const groups=new Set(matches.flatMap(m=>{const option=m.options.find(o=>o.sectionId===m.selected);return option?[JSON.stringify([option.courseId,option.professorId])]:[];}));
  assert.equal((checked(await db.from('enrollments').select('section_id').eq('user_id',userId))||[]).length,0,'Extraction must not enroll before review');
  assert.equal((await request('PATCH',JSON.stringify({sectionIds:[...ids,'missing-section']}))).status,400);
  assert.equal((checked(await db.from('enrollments').select('section_id').eq('user_id',userId))||[]).length,0,'Invalid batch must not partially enroll');
  for(let i=0;i<2;i++)assert.equal((await request('PATCH',JSON.stringify({sectionIds:[...ids,ids[0]]}))).status,200);
  assert.equal(checked(await db.from('enrollments').select('section_id').eq('user_id',userId))?.length,groups.size);
  assert.ok(checked(await db.from('profiles').select('onboarding_completed_at').eq('id',userId).single())?.onboarding_completed_at);
  assert.equal(checked(await db.from('kb_uploads').select('id').eq('uploader_id',userId))?.length,0);
  checked(await db.from('enrollments').delete().eq('user_id',userId));checked(await db.from('profiles').update({onboarding_completed_at:null}).eq('id',userId));
  assert.equal((await request('PATCH',JSON.stringify({sectionIds:[]}))).status,200);
  assert.equal(checked(await db.from('enrollments').select('section_id').eq('user_id',userId))?.length,0);
  console.log(`PASS: real screenshot → ${matches.length} rows → ${groups.size} distinct class groups; auth/origin checks, invalid-image rejection, no pre-review writes, invalid batch rejection, idempotent enrollment, completion and skip.`);
 }finally{if(userId){checked(await db.from('enrollments').delete().eq('user_id',userId));checked(await db.from('kb_quotas').delete().eq('user_id',userId));const removed=await db.auth.admin.deleteUser(userId);if(removed.error)throw removed.error;}console.log('Disposable account removed.');}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
