import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FileRequestError } from "./validation";
import { InputError } from "@/app/api/auth/validation";

export const BUCKET = "class-files";
export const FILE_COLUMNS = "id,name,size,mime_type,created_at,uploader_id,subspace_id";
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const FILES_UNAVAILABLE = "Files are temporarily unavailable. Please try again later.";

export async function fileSession() {
  if (!isSupabaseConfigured()) throw new FileRequestError(FILES_UNAVAILABLE, 503);
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new FileRequestError("Sign in to access class files.", 401);
  if (!user.email_confirmed_at || user.is_anonymous || !user.email || !/^[^\s@]+@calpoly\.edu$/i.test(user.email)) {
    throw new FileRequestError("A verified Cal Poly account is required.", 403);
  }
  return { client, user };
}

export async function requireFileMember(client: Awaited<ReturnType<typeof createClient>>, subspaceId: string) {
  const { data, error } = await client.rpc("is_subspace_member", { target: subspaceId });
  if (error) throw new FileRequestError(FILES_UNAVAILABLE, 503);
  if (data !== true) throw new FileRequestError("Join this course and professor’s class to access its files.", 403);
}

export function fileError(error: unknown) {
  if (error instanceof InputError) {
    return Response.json({ error: error.status === 403
      ? "We couldn’t accept this request. Open StudyCircle in your browser and try again."
      : FILES_UNAVAILABLE }, { status: error.status === 403 ? 403 : 503, headers: PRIVATE_HEADERS });
  }
  if (error instanceof FileRequestError) {
    return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  }
  console.error("Class files request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: FILES_UNAVAILABLE }, { status: 503, headers: PRIVATE_HEADERS });
}
