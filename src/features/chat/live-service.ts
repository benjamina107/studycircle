import type { ChatMessage, ChatOverview, ChatService } from "./types";

async function request<T>(url: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const response = await fetch(url, { ...init, credentials: "same-origin", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, signal });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? (response.status === 401 ? "Sign in to use chats." : "Unable to reach chats."));
  return payload as T;
}

export const chatService: ChatService = {
  getChatsOverview(signal) { return request<ChatOverview>("/api/chat/overview", undefined, signal); },
  listMessages(channelId, signal) { return request<ChatMessage[]>(`/api/chat/messages?channel=${encodeURIComponent(channelId)}`, undefined, signal); },
  sendMessage(input, signal) { return request<ChatMessage>("/api/chat/messages", { method: "POST", body: JSON.stringify(input) }, signal); },
};
