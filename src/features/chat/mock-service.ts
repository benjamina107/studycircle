import type { ChatMessage, ChatOverview, ChatService } from "./types";

export const DEMO_USER_ID = "demo-student";
const STORAGE_KEY = "studycircle.chat.demo.v1";
const courses = [
  { spaceId: "csc202", subspaceId: "prof-khosmood", courseName: "CSC 202", professorName: "Prof. Khosmood" },
  { spaceId: "csc202", subspaceId: "prof-workman", courseName: "CSC 202", professorName: "Prof. Workman" },
  { spaceId: "math244", subspaceId: "prof-borzellino", courseName: "MATH 244", professorName: "Prof. Borzellino" },
];
const overview: ChatOverview = {
  channels: courses.flatMap((course) => ["general", "homework", "exam-prep"].map((name) => ({ ...course, name, id: `${course.subspaceId}-${name}` }))),
  meetups: [{ id: "demo-library", title: "Library study session", locationName: "Kennedy Library · 2nd floor", startsAt: "2026-09-08T15:00:00-07:00", channelId: "prof-khosmood-general", spaceId: "csc202", subspaceId: "prof-khosmood" }],
};
const seeds: ChatMessage[] = [
  { id: "welcome-1", channelId: "prof-khosmood-general", authorId: "demo-jordan", authorName: "Jordan", body: "Anyone want to review linked lists at the library? I’ve pinned our study session above.", createdAt: "2026-09-05T18:00:00Z" },
  { id: "welcome-2", channelId: "prof-khosmood-general", authorId: "demo-sam", authorName: "Sam", body: "I’m in! Let’s work through a few examples together.", createdAt: "2026-09-05T18:02:00Z" },
];

function check(signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("You’re offline. Reconnect and try again.");
}
function validateChannel(channelId: string) {
  if (!overview.channels.some((channel) => channel.id === channelId)) throw new Error("This channel is unavailable.");
}
function readStored(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((row) => row && typeof row === "object" && ["id", "channelId", "authorId", "authorName", "body", "createdAt", "requestId"].every((key) => typeof row[key] === "string"))) {
    throw new Error("Saved demo messages could not be read. Clear this site’s demo storage to reset them.");
  }
  return parsed as ChatMessage[];
}

// Browser-only preview adapter. These checks are UX safeguards, not authorization.
// The production adapter must enforce membership and write limits in Supabase.
export const chatService: ChatService = {
  async getChatsOverview(signal) {
    check(signal);
    return structuredClone(overview);
  },
  async listMessages(channelId, signal) {
    check(signal);
    validateChannel(channelId);
    return [...seeds, ...readStored()].filter((message) => message.channelId === channelId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  },
  async sendMessage(input, signal) {
    check(signal);
    validateChannel(input.channelId);
    const body = input.body.trim();
    if (!body || body.length > 2000) throw new Error("Write a message between 1 and 2,000 characters.");
    if (!input.requestId) throw new Error("A message request ID is required.");
    if (typeof window === "undefined") throw new Error("Open the demo in a browser to send messages.");
    const write = () => {
      check(signal);
      const stored = readStored();
      const existing = stored.find((message) => message.requestId === input.requestId && message.authorId === DEMO_USER_ID);
      if (existing) {
        if (existing.channelId !== input.channelId || existing.body !== body) throw new Error("This retry belongs to a different message.");
        return existing;
      }
      if (stored.filter((message) => message.authorId === DEMO_USER_ID && Date.parse(message.createdAt) > Date.now() - 60_000).length >= 10) throw new Error("Demo posting limit reached. Wait a minute before sending again.");
      const message: ChatMessage = { id: crypto.randomUUID(), channelId: input.channelId, authorId: DEMO_USER_ID, authorName: "You", body, requestId: input.requestId, createdAt: new Date().toISOString() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, message]));
      return message;
    };
    // Serialize writes across tabs when supported, so one tab cannot overwrite another.
    return navigator.locks ? navigator.locks.request(STORAGE_KEY, { signal }, write) : write();
  },
};
