export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const FILE_LIST_LIMIT = 200;
export const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;
export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", txt: "text/plain", csv: "text/csv",
};
export const FILE_ACCEPT = Object.keys(FILE_TYPES).map((ext) => `.${ext}`).join(",");
export const validSubspaceId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export const validFileId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

export class FileRequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function parseFileCursor(value: string | null) {
  if (value === null) return null;
  const [createdAt, id, extra] = value.split("|");
  // Preserve Postgres microseconds; converting to Date.toISOString() would skip tied rows.
  if (extra !== undefined || !createdAt || !id || !validFileId(id) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt) ||
      !Number.isFinite(Date.parse(createdAt))) {
    throw new FileRequestError("We couldn’t load more files. Refresh the list and try again.");
  }
  return { createdAt, id };
}

export function validateFile(file: Pick<File, "name" | "size" | "type">) {
  if (!file.name || file.name !== file.name.trim() || file.name.length > 180 ||
      /[\x00-\x1f\x7f/\\\u202a-\u202e\u2066-\u2069]/.test(file.name) || file.name.startsWith(".")) {
    throw new FileRequestError("Use a filename of 1–180 characters without slashes or special formatting.");
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_FILE_SIZE) {
    throw new FileRequestError("Choose a non-empty file no larger than 10 MiB.", 413);
  }
  const extension = file.name.split(".").pop()!.toLowerCase();
  const mime = Object.hasOwn(FILE_TYPES, extension) ? FILE_TYPES[extension] : undefined;
  if (!mime || (file.type && file.type !== mime && file.type !== "application/octet-stream")) {
    throw new FileRequestError("Supported files: PDF, PNG, JPEG, TXT, and CSV. The file type must match its extension.", 415);
  }
  return { extension, mime };
}

/** Validate bytes as well as the browser-controlled MIME and extension. Not a malware scanner. */
export function validateContents(bytes: Uint8Array, mime: string) {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  let valid = false;
  if (mime === "application/pdf") valid = starts(37, 80, 68, 70, 45);
  if (mime === "image/png") valid = starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === "image/jpeg") valid = starts(255, 216, 255);
  if (mime === "text/plain" || mime === "text/csv") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      valid = !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text);
    } catch { valid = false; }
  }
  if (!valid) throw new FileRequestError("The file contents do not match a supported file type.", 415);
}

/** Enforce a real byte limit even for chunked requests or a false Content-Length. */
export async function readMultipart(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new FileRequestError("We couldn’t read your upload. Choose a file and try again.", 415);
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_SIZE)) {
    throw new FileRequestError("The upload request is too large.", 413);
  }
  if (!request.body) throw new FileRequestError("Choose a file to upload.");
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_SIZE) {
        await reader.cancel();
        throw new FileRequestError("The upload request is too large.", 413);
      }
      chunks.push(new Uint8Array(value));
    }
  } finally { reader.releaseLock(); }
  try {
    return await new Response(new Blob(chunks), { headers: { "Content-Type": contentType } }).formData();
  } catch { throw new FileRequestError("We couldn’t read your upload. Choose a file and try again."); }
}
