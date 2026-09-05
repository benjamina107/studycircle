import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_CHANNELS, CHAT_FIXTURE_MEETUP, CHAT_FIXTURE_MESSAGES, CHAT_MESSAGE_LIMIT, createLocalChatMessage, isChatChannel, messagesForChannel, resolveChatChannel, validateChatDraft } from "./chat-demo";

test("whitespace-only drafts fail, including unicode whitespace", () => {
  for (const draft of ["", "  \n\t", "\u00a0\u2003"]) assert.equal(validateChatDraft(draft).ok, false);
});
test("trims the outside and preserves intentional internal formatting", () => {
  assert.deepEqual(validateChatDraft("  one\n  two  \n"), { ok: true, text: "one\n  two" });
});
test("length limit is applied after trimming and rejects overflow", () => {
  assert.equal(validateChatDraft(`  ${"a".repeat(CHAT_MESSAGE_LIMIT)}  `).ok, true);
  assert.equal(validateChatDraft("a".repeat(CHAT_MESSAGE_LIMIT + 1)).ok, false);
});
test("ClassAI mentions fail locally regardless of case or position", () => {
  for (const draft of ["@ClassAI explain trees", "Please @classai, help", "Hello\n@CLASSAI?"]) {
    const result = validateChatDraft(draft);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /unavailable.*No AI request was sent/);
  }
  assert.equal(validateChatDraft("ClassAI is unavailable").ok, true);
});
test("only predefined channels are accepted; malformed query values fall back", () => {
  for (const channel of CHAT_CHANNELS) assert.equal(resolveChatChannel(channel.id), channel.id);
  for (const value of [undefined, null, ["homework"], "new-room", "__proto__", "General"]) {
    assert.equal(isChatChannel(value), false);
    assert.equal(resolveChatChannel(value), "general");
    assert.equal(createLocalChatMessage(value, "hello", "local-1").ok, false);
  }
});
test("invalid drafts never produce messages", () => {
  for (const draft of [" ", "x".repeat(1001), "@ClassAI help"]) {
    const result = createLocalChatMessage("general", draft, "local-1");
    assert.equal(result.ok, false);
    assert.equal("message" in result, false);
  }
});
test("local message has explicit local identity and no delivery claim", () => {
  assert.deepEqual(createLocalChatMessage("homework", "  hello  ", "local-1"), {
    ok: true, message: { id: "local-1", channelId: "homework", author: "You (local demo)", text: "hello", timeLabel: "This session only", kind: "local" },
  });
});
test("adding locally isolates channels and leaves seed data untouched", () => {
  const before = JSON.stringify(CHAT_FIXTURE_MESSAGES);
  const result = createLocalChatMessage("meetups", "practice", "local-1");
  assert.ok(result.ok);
  const session = [...CHAT_FIXTURE_MESSAGES, result.message];
  assert.deepEqual(messagesForChannel(session, "meetups"), [result.message]);
  assert.deepEqual(messagesForChannel(session, "general"), messagesForChannel(CHAT_FIXTURE_MESSAGES, "general"));
  assert.equal(JSON.stringify(CHAT_FIXTURE_MESSAGES), before);
  assert.equal(messagesForChannel([...CHAT_FIXTURE_MESSAGES], "meetups").length, 0);
});
test("fixture identities are unique and pin belongs to an existing channel", () => {
  assert.equal(new Set(CHAT_FIXTURE_MESSAGES.map((message) => message.id)).size, CHAT_FIXTURE_MESSAGES.length);
  assert.ok(isChatChannel(CHAT_FIXTURE_MEETUP.channelId));
  assert.ok(CHAT_FIXTURE_MESSAGES.every((message) => message.kind === "fixture" && message.author.includes("fictional") && isChatChannel(message.channelId)));
});
