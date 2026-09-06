import {classAccess,quota} from '@/lib/knowledge/access';
import {adminClient,checked} from '@/lib/knowledge/admin';
import {apiError,json} from '@/app/api/auth/_utils';
import {InputError,readJson} from '@/app/api/auth/validation';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
export async function GET(request:Request){try{
 const url=new URL(request.url),target=url.searchParams.get('class')||'',peer=url.searchParams.get('peer');
 const {db,user}=await classAccess(target);
 if(!peer)return json({members:checked(await db.rpc('classmates',{target})),userId:user.id});
 if(!uuid(peer)||peer===user.id)throw new InputError('Choose a classmate.');
 let query=db.from('class_direct_messages').select('id,sender_id,recipient_id,body,created_at,read_at').eq('subspace_id',target).or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${user.id})`);
 const before=url.searchParams.get('before'),cursor=url.searchParams.get('cursor');
 if(before){if(!/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(before)||!uuid(cursor))throw new InputError('Invalid message page.');query=query.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${cursor})`);}
 const messages=checked(await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(51))||[];
 return json({messages:messages.slice(0,50).reverse(),hasMore:messages.length>50});
}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
 const target=new URL(request.url).searchParams.get('class')||'';const {user}=await classAccess(target,request);const input=await readJson(request);
 if(!uuid(input.id)||!uuid(input.peer)||input.peer===user.id||typeof input.body!=='string'||!input.body.trim()||input.body.length>2000)throw new InputError('Write a message of up to 2,000 characters.');
 const db=adminClient();if(!checked(await db.rpc('kb_user_is_member',{who:input.peer,target})))throw new InputError('This person is no longer in this class.',403);
 const existing=checked(await db.from('class_direct_messages').select('id,sender_id,recipient_id,subspace_id,body,created_at,read_at').eq('id',input.id).maybeSingle());
 if(existing){if(existing.sender_id===user.id&&existing.recipient_id===input.peer&&existing.subspace_id===target&&existing.body===input.body.trim())return json({id:existing.id,message:existing});throw new InputError('Message ID already used.',409);}
 await quota(user.id,'direct-messages',30);
 const message=checked(await db.from('class_direct_messages').insert({id:input.id,subspace_id:target,sender_id:user.id,recipient_id:input.peer,body:input.body.trim()}).select('id,sender_id,recipient_id,body,created_at,read_at').single());return json({id:input.id,message},201);
}catch(e){return apiError(e);}}
export async function PATCH(request:Request){try{
 const target=new URL(request.url).searchParams.get('class')||'';const {user}=await classAccess(target,request);const input=await readJson(request);
 if(!uuid(input.peer)||!Array.isArray(input.ids)||input.ids.length>100||!input.ids.every(uuid))throw new InputError('Choose messages to mark read.');
 const marked=checked(await adminClient().from('class_direct_messages').update({read_at:new Date().toISOString()}).eq('subspace_id',target).eq('recipient_id',user.id).eq('sender_id',input.peer).in('id',input.ids).is('read_at',null).select('id'));return json({ok:true,readIds:(marked||[]).map(m=>m.id)});
}catch(e){return apiError(e);}}
