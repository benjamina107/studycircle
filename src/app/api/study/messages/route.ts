import { classAccess,quota } from '@/lib/knowledge/access';
import { adminClient,checked } from '@/lib/knowledge/admin';
import { hasMention,isChannel } from '@/lib/knowledge/shared';
import { apiError,json } from '@/app/api/auth/_utils';
import { InputError,readJson } from '@/app/api/auth/validation';
export async function GET(request:Request) {
 try {
  const url=new URL(request.url);const channel=url.searchParams.get('channel');
  if(!isChannel(channel))throw new InputError('Choose a channel.');
  const {db,user}=await classAccess(url.searchParams.get('class')||'');
  const messages=checked(await db.from('study_messages').select('id,author_id,role,body,payload,reply_to,ai_status,error,created_at').eq('subspace_id',url.searchParams.get('class')).eq('channel',channel).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100));
  return json({messages:(messages||[]).reverse(),userId:user.id});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request) {
 try {
  const {user}=await classAccess(new URL(request.url).searchParams.get('class')||'',request);
  const input=await readJson(request);const subspace=new URL(request.url).searchParams.get('class');
  if(!isChannel(input.channel)||typeof input.body!=='string'||!input.body.trim()||input.body.length>2000||typeof input.id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.id))throw new InputError('Write a message between 1 and 2,000 characters.');
  const db=adminClient();const existing=checked(await db.from('study_messages').select('id,author_id,subspace_id,channel,body').eq('id',input.id).maybeSingle());
  if(existing){if(existing.author_id===user.id&&existing.subspace_id===subspace&&existing.channel===input.channel&&existing.body===input.body.trim())return json({id:existing.id});throw new InputError('That message ID is already in use.',409);}
  await quota(user.id,'messages',30);
  const askAI=input.channel==='ai'||hasMention(input.body);
  if(askAI)await quota(user.id,'ai',5);
  const result=await db.from('study_messages').insert({id:input.id,subspace_id:subspace,channel:input.channel,author_id:user.id,role:'user',body:input.body.trim(),private_owner_id:input.channel==='ai'?user.id:null,ai_status:askAI?'queued':'none'});
  if(result.error)throw new InputError('Your message could not be sent. Please retry.',503);
  return json({id:input.id},201);
 }catch(error){return apiError(error);}
}
export async function PATCH(request:Request) {
 try {
  const subspace=new URL(request.url).searchParams.get('class')||'';
  const {user}=await classAccess(subspace,request);await quota(user.id,'ai',5);
  const body=await readJson(request);
  if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id))throw new InputError('Message unavailable.');
  checked(await adminClient().from('study_messages').update({ai_status:'queued',attempts:0,error:null,available_at:new Date().toISOString()}).eq('id',body.id).eq('author_id',user.id).eq('subspace_id',subspace).eq('ai_status','failed'));
  return json({message:'AI request queued again.'});
 }catch(error){return apiError(error);}
}
