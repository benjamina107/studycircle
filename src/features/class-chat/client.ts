import type { ClassFile, Message } from "./types";

export async function chatRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Unable to reach class chat. Please try again.");
  if (!data) throw new Error("Class chat returned an unreadable response. Please try again.");
  return data as T;
}

export type PendingMessage = {
  requestId: string; channelId: string; subspaceId: string; body: string;
  localFile: File | null; file: ClassFile | null; uploaded: boolean;
};

// Keep this object after failure: a completed upload and retry ID must survive retries.
export async function sendPending(pending: PendingMessage, onUploaded: (file: ClassFile) => void = () => {}) {
  if (pending.localFile && !pending.file) {
    const form = new FormData();
    form.set("subspaceId", pending.subspaceId);
    form.set("file", pending.localFile);
    const { file } = await chatRequest<{ file: ClassFile }>("/api/class-files", { method: "POST", body: form });
    if (!file?.id || file.subspace_id !== pending.subspaceId) throw new Error("The upload could not be confirmed. Check Files before uploading again.");
    pending.file = file;
    pending.uploaded = true;
    onUploaded(file);
  }
  return chatRequest<Message>("/api/chat/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId: pending.channelId, requestId: pending.requestId, body: pending.body, file_id: pending.file?.id ?? null }),
  });
}
