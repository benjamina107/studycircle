/** Synthetic fixtures only. No catalog, users, network, or storage. */
export const CHAT_MESSAGE_LIMIT = 1000;
export const CHAT_CHANNELS = [
  { id: "general", description: "Questions, introductions, and study plans." },
  { id: "homework", description: "Work through the approach together." },
  { id: "meetups", description: "Study sessions and meetup invites." },
] as const;
export type ChatChannelId = (typeof CHAT_CHANNELS)[number]["id"];
export type ChatMessage = Readonly<{
  id: string; channelId: ChatChannelId; author: string; text: string;
  timeLabel: string; kind: "fixture" | "local";
}>;
export const CHAT_FIXTURE_CONTEXT = "DEMO 101 · Thinking in structures · Professor Lumen (fictional)";
export const CHAT_FIXTURE_MESSAGES: readonly ChatMessage[] = [
  { id: "sample-1", channelId: "general", author: "Avery (fictional)", text: "Anyone up for sketching a few tree traversals at the practice meetup?", timeLabel: "Sample · 2:10 PM", kind: "fixture" },
  { id: "sample-2", channelId: "general", author: "Mika (fictional)", text: "Yes! I’ll bring paper examples. Let’s start with breadth-first search.", timeLabel: "Sample · 2:12 PM", kind: "fixture" },
  { id: "sample-3", channelId: "general", author: "Rowan (fictional)", text: "I added the study session to Meetups.", timeLabel: "Sample · 2:14 PM", kind: "fixture" },
  { id: "sample-4", channelId: "homework", author: "Mika (fictional)", text: "For the imaginary worksheet: what changes if we use a queue instead of a stack?", timeLabel: "Sample · 1:45 PM", kind: "fixture" },
  { id: "sample-5", channelId: "homework", author: "Avery (fictional)", text: "Try drawing the order in which each node is visited.", timeLabel: "Sample · 1:48 PM", kind: "fixture" },
];
export const CHAT_FIXTURE_MEETUP = {
  title: "Tree traversal practice", when: "Sep 18, 2030 · 3:00–4:00 PM Pacific",
  location: "Imaginary Library · Blue room", channelId: "meetups" as const,
};
export function isChatChannel(value: unknown): value is ChatChannelId {
  return typeof value === "string" && CHAT_CHANNELS.some((channel) => channel.id === value);
}
export function resolveChatChannel(value: unknown): ChatChannelId {
  return isChatChannel(value) ? value : "general";
}
export type DraftResult = { ok: true; text: string } | { ok: false; error: string };
export function validateChatDraft(raw: string): DraftResult {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Write a message first. Spaces alone don’t count." };
  if (text.length > CHAT_MESSAGE_LIMIT) return { ok: false, error: `Shorten your message to ${CHAT_MESSAGE_LIMIT} characters or fewer. Spaces at the start and end don’t count.` };
  if (/@classai\b/i.test(text)) return { ok: false, error: "@ClassAI is unavailable in this preview. Remove the mention to add your message to this page only. No AI request was sent." };
  return { ok: true, text };
}
export function createLocalChatMessage(channel: unknown, raw: string, id: string):
  { ok: true; message: ChatMessage } | { ok: false; error: string } {
  if (!isChatChannel(channel)) return { ok: false, error: "Choose one of the sample channels." };
  const result = validateChatDraft(raw);
  if (!result.ok) return result;
  return { ok: true, message: { id, channelId: channel, author: "You (local demo)", text: result.text, timeLabel: "This session only", kind: "local" } };
}
export function messagesForChannel(messages: readonly ChatMessage[], channel: ChatChannelId): ChatMessage[] {
  return messages.filter((message) => message.channelId === channel);
}
