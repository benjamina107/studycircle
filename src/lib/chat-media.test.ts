import assert from "node:assert/strict";
import test from "node:test";
import { MEDIA_LIMIT, mediaError } from "./chat-media";
import { CHAT_CHANNELS, CHAT_FIXTURE_MEETUP, resolveChatChannel } from "./chat-demo";
test("exactly the requested channels, with invites in meetups", () => {
  assert.deepEqual(CHAT_CHANNELS.map(item => item.id), ["general", "homework", "meetups"]);
  assert.equal(CHAT_FIXTURE_MEETUP.channelId, "meetups");
  assert.equal(resolveChatChannel("exam-prep"), "general");
});
test("files are bounded and active document types are rejected", () => {
  assert.equal(mediaError([{size:1024,type:"application/pdf"}]),null);
  for(const type of ["text/html","image/svg+xml","application/javascript",""]) assert.ok(mediaError([{size:100,type}]));
  assert.ok(mediaError([{size:MEDIA_LIMIT + 1,type:"image/png"}]));
  assert.ok(mediaError([{size:0,type:"text/plain"}]));
  assert.ok(mediaError(Array.from({length:6},() => ({size:12,type:"text/plain"}))));
});
