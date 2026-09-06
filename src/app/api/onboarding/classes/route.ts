import {getCurrentUser} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {assertSameOrigin,InputError,readJson} from '@/app/api/auth/validation';
import {apiError,json} from '@/app/api/auth/_utils';
import {quota} from '@/lib/knowledge/access';
import {extractSchedule,screenshotData} from '@/lib/onboarding/extract';
import {matchClasses,type CatalogCourse} from '@/lib/onboarding/matching';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request){
 try{
  assertSameOrigin(request);
  const user=await getCurrentUser();if(!user)throw new InputError('Sign in to import your classes.',401);
  await quota(user.id,'schedule-screenshots',4);
  const reader=request.body?.getReader();if(!reader)throw new InputError('Choose a screenshot.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12_000_000){await reader.cancel();throw new InputError('Upload up to 12 MB at a time.',413);}chunks.push(value);}
  let form:FormData;try{form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}catch{throw new InputError('This upload could not be read.');}
  const files=form.getAll('screenshots');if(files.length<1||files.length>4||files.some(f=>!(f instanceof File)))throw new InputError('Choose 1–4 screenshots.');
  const images=[];for(const file of files as File[])images.push(await screenshotData(Buffer.from(await file.arrayBuffer())));
  const rows=await extractSchedule(images);
  if(!rows.length)return json({matches:[],message:'No classes were readable. Include the course and section codes, and try a closer screenshot.'});
  const codes=[...new Set(rows.map(r=>r.courseCode.toUpperCase().replace(/^([A-Z]+)[ -]*(\d+[A-Z]*)$/,'$1 $2')))];
  const db=await createClient();
  const {data,error}=await db.from('courses').select('id,code,title,term,sections(id,course_id,professor_id,section_code,professors(name))').in('code',codes).returns<CatalogCourse[]>();
  if(error)throw new Error('Catalog unavailable');
  return json({matches:matchClasses(rows,data||[])});
 }catch(error){return apiError(error);}
}

export async function PATCH(request:Request){
 try{
  assertSameOrigin(request);
  if(!await getCurrentUser())throw new InputError('Sign in to add your classes.',401);
  const body=await readJson(request);
  const {finishOnboarding}=await import('@/app/onboarding/actions');
  const result=await finishOnboarding(body.sectionIds as string[]);
  return json(result,result.ok?200:400);
 }catch(error){return apiError(error);}
}
