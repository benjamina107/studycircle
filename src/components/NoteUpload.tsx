"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "text/plain"]);
const MAX_BYTES = 10 * 1024 * 1024;

export default function NoteUpload({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) {
      setError("Upload a PDF, JPEG, PNG, or text file up to 10 MB.");
      return;
    }
    setUploading(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); setError("Sign in before uploading."); return; }
    const path = `${folderId}/${user.id}/${crypto.randomUUID()}`;
    const { error: storageError } = await supabase.storage.from("lecture-notes").upload(path, file, { contentType: file.type, upsert: false });
    if (storageError) { setUploading(false); setError(storageError.message); return; }
    const { error: metadataError } = await supabase.from("notes").insert({ lecture_folder_id: folderId, uploader_id: user.id, file_name: file.name, file_url: path, mime_type: file.type });
    if (metadataError) {
      await supabase.storage.from("lecture-notes").remove([path]);
      setUploading(false); setError(metadataError.message); return;
    }
    setUploading(false); router.refresh();
  }

  return <div><label className="cursor-pointer text-sm font-medium text-emerald-700"><input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,text/plain" onChange={upload} disabled={uploading} />{uploading ? "Uploading…" : "Upload notes"}</label>{error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}</div>;
}
