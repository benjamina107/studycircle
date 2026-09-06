import { BUCKET, FILES_UNAVAILABLE, PRIVATE_HEADERS, fileError, fileSession, requireFileMember } from "@/features/files/server";
import { FileRequestError, validFileId, validSubspaceId, validateFile } from "@/features/files/validation";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await fileSession();
    const { id } = await params;
    if (!validFileId(id)) throw new FileRequestError("File not found.", 404);
    const { data: file, error } = await client.from("class_files").select("*").eq("id", id).maybeSingle();
    if (error) throw new FileRequestError(FILES_UNAVAILABLE, 503);
    if (!file) throw new FileRequestError("File not found or you no longer have access.", 404);
    await requireFileMember(client, file.subspace_id);
    const { extension } = validateFile({ name: file.name, size: file.size, type: file.mime_type });
    if (!validSubspaceId(file.subspace_id) || file.object_path !== `${file.subspace_id}/${file.uploader_id}/${id}.${extension}`) {
      throw new FileRequestError(FILES_UNAVAILABLE, 503);
    }
    const { data, error: signingError } = await client.storage.from(BUCKET)
      .createSignedUrl(file.object_path, 60, { download: file.name });
    if (signingError || !data?.signedUrl) throw new FileRequestError("The download is unavailable. Try again.", 503);
    return new Response(null, { status: 302, headers: { ...PRIVATE_HEADERS, Location: data.signedUrl, "Referrer-Policy": "no-referrer" } });
  } catch (error) { return fileError(error); }
}
