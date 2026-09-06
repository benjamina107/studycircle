// Explicit opt-in: creates and removes isolated synthetic fixtures. Does not send emails.
import {config} from 'dotenv';config({path:'.env.local',quiet:true});
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,writeFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
import {adminClient,checked} from '../src/lib/knowledge/admin';
import {workerTick} from '../src/lib/knowledge/worker';
import {aiClient} from '../src/lib/knowledge/openai';
import {quizletText} from '../src/lib/knowledge/shared';
async function main() {
if(!process.argv.includes('--run'))throw new Error('Pass --run to authorize isolated hosted fixtures and paid AI verification.');
const db=adminClient(), id='ai-check-'+randomUUID(), origin=process.env.APP_URL||'http://127.0.0.1:3000';
const dir=await mkdtemp(join(tmpdir(),'study-ai-check-'));
let userId:string|undefined;
try {
 const password=randomUUID()+'Aa1!';
 const account=await db.auth.admin.createUser({email:id+'@calpoly.edu',password,email_confirm:true,user_metadata:{name:'Temporary AI verification'}});
 if(account.error)throw account.error;userId=account.data.user.id;
 checked(await db.from('courses').insert({id,code:id,title:'Temporary AI verification',term:'Test'}));
 checked(await db.from('professors').insert({id,name:'Temporary AI verification'}));
 checked(await db.from('sections').insert({id,course_id:id,professor_id:id,section_code:'01',days:'M'}));
 checked(await db.from('spaces').insert({id,course_id:id}));checked(await db.from('subspaces').insert({id,space_id:id,professor_id:id}));
 checked(await db.from('enrollments').insert({user_id:userId,section_id:id}));
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:id+'@calpoly.edu',password})});
 assert.equal(login.status,200,'fixture login');const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const headers={Origin:origin,Cookie:cookie};
 const pdf=await PDFDocument.create();const page=pdf.addPage();const font=await pdf.embedFont(StandardFonts.Helvetica);
 page.drawText('A linked list stores nodes connected by pointers.',{x:40,y:740,size:15,font});page.drawText('Insertion at the head is O(1) when the head pointer is known.',{x:40,y:710,size:14,font});
 const pdfBytes=await pdf.save();
 const imageBytes=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="250"><rect width="900" height="250" fill="white"/><text x="30" y="60" font-size="24">Linked list: HEAD → A → B → NULL</text><text x="30" y="120" font-size="22">To prepend X: X.next = HEAD; HEAD = X.</text></svg>')).png().toBuffer();
 const speech=await aiClient().audio.speech.create({model:'gpt-4o-mini-tts',voice:'alloy',input:'Searching a singly linked list takes linear time because we may visit every node. Arrays provide constant time access by index.',response_format:'wav'});
 await writeFile(join(dir,'sample.wav'),Buffer.from(await speech.arrayBuffer()));
 const form=new FormData();form.set('description','HW 3 linked lists');form.append('files',new File([pdfBytes as Uint8Array<ArrayBuffer>],'notes.pdf',{type:'application/pdf'}));form.append('files',new File([new Uint8Array(imageBytes)],'diagram.png',{type:'image/png'}));form.append('files',new File([new Uint8Array(await readFile(join(dir,'sample.wav')))],'recording.wav',{type:'audio/wav'}));
 const uploaded=await fetch(origin+`/api/study/uploads?class=${id}`,{method:'POST',headers,body:form});
 const uploadData=await uploaded.json();assert.equal(uploaded.status,201,JSON.stringify(uploadData));console.log('PASS: real PDF, image, and audio uploaded through authenticated API.');
 for(let i=0;i<3;i++)await workerTick();
 const assets=checked(await db.from('kb_assets').select('id,status,error').eq('subspace_id',id));assert.ok(assets?.every(a=>a.status==='ready'),JSON.stringify(assets));console.log('PASS: all three media types extracted and indexed.');
 const duplicate=new FormData();duplicate.append('files',new File([pdfBytes as Uint8Array<ArrayBuffer>],'same-notes.pdf',{type:'application/pdf'}));
 const dup=await fetch(origin+`/api/study/uploads?class=${id}`,{method:'POST',headers,body:duplicate});assert.equal(dup.status,201);const dupData=await dup.json();
 assert.equal((await db.from('kb_assets').select('id').eq('subspace_id',id)).data?.length,3);console.log('PASS: duplicate reuses extraction.');
 const messageId=randomUUID();
 const request={id:messageId,channel:'general',body:'@AI make 4 question and answer cards about linked lists from HW 3.'};
 const posted=await fetch(origin+`/api/study/messages?class=${id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request)});assert.equal(posted.status,201);
 await workerTick();
 const answer=checked(await db.from('study_messages').select('body,payload').eq('reply_to',messageId).single());assert.ok(answer?.payload.cards.length>=2);assert.ok(answer?.payload.sources.length);
 assert.ok(quizletText(answer.payload.cards).split('\n').every(row=>row.split('\t').length===2));console.log('PASS: sourced AI cards generated, saved, and serialized for Quizlet.');
 for(let i=0;i<7;i++) {
  const filler=await fetch(origin+`/api/study/messages?class=${id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),channel:'general',body:`Study check-in ${i+1}.`})});assert.equal(filler.status,201);
 }
 const followupId=randomUUID();
 const followup=await fetch(origin+`/api/study/messages?class=${id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:followupId,channel:'general',body:'@AI update the practice set from earlier: reverse the order of its cards, preserving every question and answer exactly. Return the full set.'})});assert.equal(followup.status,201);
 await workerTick();
 const revised=checked(await db.from('study_messages').select('payload').eq('reply_to',followupId).single());
 assert.deepEqual(revised?.payload.cards,[...answer.payload.cards].reverse());
 console.log('PASS: follow-up retrieves cards beyond six messages and returns the exact revised set.');
 if(process.argv.includes('--hold-ui')) {
  await writeFile('/tmp/studycircle-ui-fixture.json',JSON.stringify({email:id+'@calpoly.edu',password,classUrl:origin+'/spaces/'+id+'/'+id+'/chat',release:'/tmp/studycircle-ui-release'}),{mode:0o600});
  console.log('UI fixture ready. Waiting up to 10 minutes for /tmp/studycircle-ui-release.');
  for(let i=0;i<120;i++){try{await access('/tmp/studycircle-ui-release');break;}catch{await new Promise(r=>setTimeout(r,5000));}}
  await rm('/tmp/studycircle-ui-fixture.json',{force:true});await rm('/tmp/studycircle-ui-release',{force:true});
 }
 const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 assert.ok((await anonymous.from('kb_chunks').select('id')).error);assert.ok((await anonymous.storage.from('class-notes').download('anything')).error);
 const other=await fetch(origin+'/api/study/uploads?class=not-your-class',{headers});assert.equal(other.status,403);console.log('PASS: anonymous and cross-class access rejected.');
 for(const uploadId of [...uploadData.ids, ...dupData.ids]){const deleted=await fetch(origin+`/api/study/uploads/${uploadId}`,{method:'DELETE',headers});assert.equal(deleted.status,200);}
 assert.equal((await db.from('kb_assets').select('id').eq('subspace_id',id)).data?.length,0);console.log('PASS: last contribution deletion removes indexed material.');
 await workerTick();
} finally {
 // Only rows belonging to this run's unpredictable fixture ID are removed.
 const uploads=(await db.from('kb_uploads').select('id,uploader_id').eq('subspace_id',id)).data||[];
 for(const u of uploads)await db.rpc('kb_remove_upload',{upload_id:u.id,who:u.uploader_id});
 const garbage=(await db.from('kb_garbage').select('object_path').like('object_path',id+'/%')).data||[];
 if(garbage.length){const paths=garbage.map(g=>g.object_path);await db.storage.from('class-notes').remove(paths);await db.from('kb_garbage').delete().in('object_path',paths);}
 await db.from('study_messages').delete().eq('subspace_id',id);await db.from('enrollments').delete().eq('section_id',id);
 await db.from('subspaces').delete().eq('id',id);await db.from('spaces').delete().eq('id',id);await db.from('sections').delete().eq('id',id);await db.from('courses').delete().eq('id',id);await db.from('professors').delete().eq('id',id);
 if(userId){await db.from('kb_quotas').delete().eq('user_id',userId);await db.auth.admin.deleteUser(userId);}
 await rm(dir,{recursive:true,force:true});console.log('Temporary verification fixtures cleaned up.');
}

}
main().catch(error=>{console.error(error instanceof Error?error.message:"Verification failed");process.exitCode=1;});
