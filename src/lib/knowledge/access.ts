import 'server-only';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { assertSameOrigin, InputError } from '@/app/api/auth/validation';
import { adminClient, checked } from './admin';
export async function classAccess(subspace: string, request?: Request) {
  if(request) assertSameOrigin(request);
  if(!subspace || subspace.length>200) throw new InputError('Choose a class.',400);
  const user=await getCurrentUser();
  if(!user) throw new InputError('Sign in to use your class.',401);
  const db=await createClient();
  const result=await db.rpc('is_subspace_member',{target:subspace});
  if(result.error || !result.data) throw new InputError('This class is unavailable.',403);
  return {user,db};
}
export async function quota(userId: string, action: string, limit: number) {
  if(!checked(await adminClient().rpc('kb_take_quota',{who:userId,action,max_count:limit}))) throw new InputError('Please wait a minute before trying again.',429);
}
