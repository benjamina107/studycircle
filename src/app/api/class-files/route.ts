import { FILE_COLUMNS, FILES_UNAVAILABLE, PRIVATE_HEADERS, fileError, fileSession, requireFileMember } from "@/features/files/server";
import { FILE_LIST_LIMIT, FileRequestError, parseFileCursor, readMultipart, validSubspaceId, validateContents, validateFile } from "@/features/files/validation";
import { saveUpload } from "@/features/files/upload";
import { assertSameOrigin } from "@/app/api/auth/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { client } = await fileSession();
    const params = new URL(request.url).searchParams;
    const subspaceId = params.get("subspaceId");
    if (!validSubspaceId(subspaceId)) throw new FileRequestError("Choose a valid class.");
    await requireFileMember(client, subspaceId);
    const cursor = parseFileCursor(params.get("cursor"));
    let query = client.from("class_files").select(FILE_COLUMNS).eq("subspace_id", subspaceId);
    if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(FILE_LIST_LIMIT + 1);
    if (error) throw new FileRequestError(FILES_UNAVAILABLE, 503);
    const files = (data ?? []).slice(0, FILE_LIST_LIMIT);
    const hasMore = (data?.length ?? 0) > FILE_LIST_LIMIT;
    const last = files.at(-1);
    return Response.json({ files, hasMore, nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null }, { headers: PRIVATE_HEADERS });
  } catch (error) { return fileError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { client, user } = await fileSession();
    const form = await readMultipart(request);
    if (form.getAll("subspaceId").length !== 1 || form.getAll("file").length !== 1 ||
        [...form.keys()].some((key) => key !== "subspaceId" && key !== "file")) {
      throw new FileRequestError("Choose a class and one file to upload.");
    }
    const subspaceId = form.get("subspaceId");
    const file = form.get("file");
    if (!validSubspaceId(subspaceId)) throw new FileRequestError("Choose a valid class.");
    await requireFileMember(client, subspaceId);
    if (!(file instanceof File)) throw new FileRequestError("Choose a file to upload.");
    const { extension, mime } = validateFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateContents(bytes, mime);
    const id = crypto.randomUUID();
    const saved = await saveUpload(client, {
      id, name: file.name, size: file.size, mime_type: mime, uploader_id: user.id,
      subspace_id: subspaceId, object_path: `${subspaceId}/${user.id}/${id}.${extension}`,
    }, bytes);
    return Response.json({ file: saved }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) { return fileError(error); }
}
