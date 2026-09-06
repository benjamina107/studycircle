import { createClient } from '@supabase/supabase-js';
// This module is imported only by server routes and the standalone worker.
export function adminClient() {
  if (typeof window !== 'undefined') throw new Error('Server-only client');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error('Worker configuration missing');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function checked<T>(result: {data:T;error:unknown}): T {
  if(result.error) throw new Error('Database operation failed');
  return result.data;
}
