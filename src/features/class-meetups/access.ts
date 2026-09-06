import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordId } from "@/lib/feed";

/** Catalog visibility alone does not imply enrollment. Check the exact pair. */
export async function canAccessClass(db: SupabaseClient, spaceId: string, subspaceId: string) {
  if (!recordId(spaceId) || !recordId(subspaceId)) return false;
  const parent = await db.from("subspaces").select("id").eq("id", subspaceId).eq("space_id", spaceId).maybeSingle();
  if (parent.error || !parent.data) return false;
  const membership = await db.rpc("is_subspace_member", { target: subspaceId });
  return !membership.error && membership.data === true;
}
