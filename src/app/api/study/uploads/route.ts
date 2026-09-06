import { createHash,randomUUID } from 'node:crypto';
import { classAccess,quota } from '@/lib/knowledge/access';
import { adminClient,checked } from '@/lib/knowledge/admin';
import { validateFile } from '@/lib/knowledge/files';
import { checkAudio,checkDocx } from '@/lib/knowledge/extract';
import { apiError,json } from '@/app/api/auth/_utils';
import { InputError } from '@/app/api/auth/validation';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(request: Request) {
 try {
  const subspace=new URL(request.url).searchParams.get('class')||'';
  const {db,user}=await classAccess(subspace);
  const files=checked(await db.from('kb_uploads').select('id,file_name,description,uploader_id,contribution_id,byte_size,created_at,kb_assets(status,error)').eq('subspace_id',subspace).order('created_at',{ascending:false}).limit(200));
  return json({files,userId:user.id});
 }catch(error){return apiError(error);}
}
// Bound the actual streamed body, even if Content-Length is absent or dishonest.
async function boundedForm(request: Request) {
 const reader=request.body?.getReader();if(!reader) throw new InputError('Choose files to upload.');
 const chunks:Uint8Array[]=[];let length=0;
 while(true) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>30_000_000){await reader.cancel();throw new InputError('Upload up to 30 MB at a time.',413);}chunks.push(value);}
 try {return await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}
 catch{throw new InputError('This upload could not be read.');}
}
export async function POST(request: Request) {
 try {
  const subspace=new URL(request.url).searchParams.get('class')||'';
  const {user}=await classAccess(subspace,request);await quota(user.id,'uploads',10);
  const form=await boundedForm(request);const description=String(form.get('description')||'').trim();
  const files=form.getAll('files');
  if(description.length>1000||files.length<1||files.length>5||files.some(f=>!(f instanceof File))) throw new InputError('Choose 1–5 files and a description up to 1,000 characters.');
  const prepared=[];
  for(const value of files) {
   const file=value as File;const bytes=Buffer.from(await file.arrayBuffer());
   let mime:string;
   try {mime=await validateFile(file.name,bytes);if(mime.startsWith('audio/')||mime==='application/ogg')await checkAudio(bytes,file.name);if(mime.includes('wordprocessingml'))await checkDocx(bytes);}
   catch(error){throw new InputError(error instanceof Error?error.message:'This file could not be read.');}
   prepared.push({bytes,mime,name:file.name.replace(/[\x00-\x1f\/\\]/g,'_').slice(0,200)||'notes'});
  }
  const db=adminClient();const contribution=randomUUID();const created:string[]=[];
  try {
   for(const file of prepared) {
    const id=randomUUID();const objectPath=`${subspace}/${user.id}/${id}`;
    checked(await db.storage.from('class-notes').upload(objectPath,file.bytes,{contentType:file.mime,upsert:false}));
    try {
     checked(await db.rpc('kb_attach_upload',{p:{id,subspace_id:subspace,uploader_id:user.id,contribution_id:contribution,file_name:file.name,object_path:objectPath,byte_size:file.bytes.length,description,mime_type:file.mime,sha256:createHash('sha256').update(file.bytes).digest('hex')}}));
     created.push(id);
    }catch(error){await db.from('kb_garbage').upsert({object_path:objectPath});throw error;}
   }
  }catch(error){for(const id of created)await db.rpc('kb_remove_upload',{upload_id:id,who:user.id});throw error;}
  return json({message:'Uploaded. Processing will continue in the background.',ids:created},201);
 }catch(error){return apiError(error);}
}
