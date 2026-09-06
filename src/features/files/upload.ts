import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassFile } from "./types";
import { FileRequestError } from "./validation";

/** Storage and Postgres are not atomic. Always report uncertain persistence honestly. */
export async function saveUpload(client: SupabaseClient, row: Omit<ClassFile, "created_at"> & { object_path: string }, bytes: Uint8Array) {
  const bucket = client.storage.from("class-files");
  let uploaded = false;
  try {
    const { error } = await bucket.upload(row.object_path, bytes, {
      contentType: row.mime_type, upsert: false, cacheControl: "0",
    });
    if (error) throw error;
    uploaded = true;
    const { data, error: metadataError } = await client.from("class_files").insert(row)
      .select("id,name,size,mime_type,created_at,uploader_id,subspace_id").single();
    if (metadataError || !data) throw metadataError || new Error("Missing metadata");
    return data as ClassFile;
  } catch {
    // A lost response may mean the insert committed. Check before attempting removal.
    try {
      const { data, error } = await client.from("class_files")
        .select("id,name,size,mime_type,created_at,uploader_id,subspace_id").eq("id", row.id).maybeSingle();
      if (!error && data) return data as ClassFile;
      if (error) throw error;
      const { data: removed, error: cleanupError } = await bucket.remove([row.object_path]);
      if (cleanupError || !removed?.some((object) => object.name === row.object_path)) throw cleanupError || new Error("Removal not confirmed");
    } catch {
      console.error("Class file upload needs reconciliation", { fileId: row.id, objectPath: row.object_path, uploaded });
      throw new FileRequestError(`We couldn’t confirm whether your file was saved or whether its temporary copy was removed. Refresh the file list before retrying. If it is missing, contact support with reference ${row.id}.`, 503);
    }
    throw new FileRequestError("Upload failed. The temporary copy was removed. Please try again.", 503);
  }
}
