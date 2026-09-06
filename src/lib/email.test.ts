import test from "node:test";
import assert from "node:assert/strict";
import { EmailProviderError, sendNotificationEmail, sendTestEmail } from "./email.ts";

const originalFetch = global.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;

function restore() {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = originalFrom;
}

test("notification sender fails explicitly when no verified sender is configured", async () => {
  try {
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "noreply@example.com";
    await assert.rejects(sendTestEmail("student@calpoly.edu"), EmailProviderError);
  } finally { restore(); }
});

test("notification sender reports provider acceptance, not delivery", async () => {
  try {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "StudyCircle <mail@example.edu>";
    let request: Request | undefined;
    global.fetch = async (input, init) => {
      request = new Request(input, init);
      return Response.json({ id: "provider-message-id" }, { status: 200 });
    };
    assert.deepEqual(await sendNotificationEmail({ to: "student@calpoly.edu", event: "MENTION", subject: "Mention", body: "You were mentioned" }), { accepted: true, id: "provider-message-id" });
    assert.equal(request?.url, "https://api.resend.com/emails");
    assert.equal(request?.headers.get("authorization"), "Bearer re_test");
    assert.deepEqual(await request?.json(), { from: "StudyCircle <mail@example.edu>", to: "student@calpoly.edu", subject: "Mention", text: "You were mentioned" });
  } finally { restore(); }
});

test("provider rejection remains an explicit failure", async () => {
  try {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "StudyCircle <mail@example.edu>";
    global.fetch = async () => Response.json({ message: "Sender is not verified" }, { status: 403 });
    await assert.rejects(sendTestEmail("student@calpoly.edu"), /Sender is not verified/);
  } finally { restore(); }
});
