export class FileClientError extends Error {}

/** Never surface browser/network/parser internals to the class UI. */
export async function requestFileJson<T>(url: string, options: RequestInit, fallback: string): Promise<T> {
  let response: Response;
  let result: unknown;
  try {
    response = await fetch(url, options);
    result = await response.json();
  } catch { throw new FileClientError(fallback); }
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error : fallback;
    throw new FileClientError(message);
  }
  if (!result || typeof result !== "object") throw new FileClientError(fallback);
  return result as T;
}

export function fileClientMessage(error: unknown, fallback: string) {
  return error instanceof FileClientError ? error.message : fallback;
}
