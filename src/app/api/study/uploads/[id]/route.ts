import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { adminClient,checked } from '@/lib/knowledge/admin';
import { assertSameOrigin,InputError } from '@/app/api/auth/validation';
import { apiError,json } from '@/app/api/auth/_utils';
import { quota } from '@/lib/knowledge/access';
type Context={params:Promise<{id:string}>};
async function upload(context:Context) {
 const {id}=await context.params;
 if(!/^[a-f0-9-]{36}$/i.test(id))throw new InputError('File unavailable.',404);
 const user=await getCurrentUser();if(!user)throw new InputError('Sign in to open this file.',401);
 const db=await createClient();const file=checked(await db.from('kb_uploads').select('id,asset_id,uploader_id,object_path,file_name').eq('id',id).maybeSingle());
 if(!file)throw new InputError('This file was removed or is unavailable to you.',404);
 return {file,user};
}
export async function GET(request:Request,context:Context) {
 try {const {file}=await upload(context);
  const data=checked(await adminClient().storage.from('class-notes').createSignedUrl(file.object_path,60,{download:file.file_name}));
  if(!data)throw new Error("File link unavailable");
  return new Response(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch(error){return apiError(error);}
}
export async function DELETE(request:Request,context:Context) {
 try {assertSameOrigin(request);const {file,user}=await upload(context);
  if(file.uploader_id!==user.id)throw new InputError('Only the uploader can remove this file.',403);
  checked(await adminClient().rpc('kb_remove_upload',{upload_id:file.id,who:user.id}));return json({message:'Removed. Future AI answers will use the remaining material.'});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request,context:Context) {
 try {assertSameOrigin(request);const {file,user}=await upload(context);
  if(file.uploader_id!==user.id)throw new InputError('Only the uploader can retry this file.',403);
  await quota(user.id,'retry-upload',5);
  checked(await adminClient().from('kb_assets').update({status:'queued',attempts:0,error:null,available_at:new Date().toISOString()}).eq('id',file.asset_id).eq('status','failed'));
  return json({message:'Queued for another attempt.'});
 }catch(error){return apiError(error);}
}
