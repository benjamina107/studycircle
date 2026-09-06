"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateLectureFoldersAction(spaceId: string, subspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to generate lecture folders.");
  const { error } = await supabase.rpc("generate_lecture_folders", { target_subspace_id: subspaceId });
  if (error) throw new Error(error.message);
  revalidatePath(`/spaces/${spaceId}/${subspaceId}/lectures`);
}
