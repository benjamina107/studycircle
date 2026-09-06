import assert from "node:assert/strict";
import test from "node:test";
import { applicationOrigin, assertSameOrigin, avatarInput, calPolyEmail, passwordInput, readJson, textInput, validateProfile } from "./validation";

test("Cal Poly email is normalized and rejects domain/format bypasses", () => {
  assert.equal(calPolyEmail("  Student+study@CALPOLY.edu "), "student+study@calpoly.edu");
  for (const input of [null, 42, "a@gmail.com", "a@calpoly.edu.evil.com", "a@sub.calpoly.edu", "a@@calpoly.edu", "a b@calpoly.edu", "a\n@calpoly.edu", ".a@calpoly.edu", "a..b@calpoly.edu"]) assert.throws(() => calPolyEmail(input));
});

test("password validation preserves whitespace and limits signup length", () => {
  const password = "  a long password  ";
  assert.equal(passwordInput(password, true), password);
  assert.throws(() => passwordInput("too short", true));
  assert.throws(() => passwordInput("a".repeat(129), true));
  assert.throws(() => passwordInput({ password: "valid password" }));
  assert.equal(passwordInput("older-pass"), "older-pass");
});

test("profile validation rejects executable URLs, credentials and oversized fields", () => {
  assert.equal(avatarInput(""), null);
  assert.equal(avatarInput("https://example.com/me.png"), "https://example.com/me.png");
  for (const value of ["javascript:alert(1)", "data:image/svg+xml,x", "http://example.com/a", "https://user:secret@example.com/a"]) assert.throws(() => avatarInput(value));
  assert.throws(() => textInput(" ", "Name", 100, true));
  assert.throws(() => textInput("a".repeat(101), "Name", 100, true));
});

test("onboarding profile validation returns field errors without dropping entered values", () => {
  const form = new FormData();
  form.set("name", " "); form.set("major", "x".repeat(121)); form.set("interests", "ok"); form.set("avatar_url", "https://user:secret@example.com/picture.png");
  const result = validateProfile(form);
  assert.deepEqual(Object.keys(result.errors).sort(), ["avatar_url", "major", "name"]);
  assert.equal(result.values.name, " ");
  assert.equal(result.values.major.length, 121);
  assert.equal(result.profile, undefined);
  const valid = new FormData();
  valid.set("name", "Alex Student"); valid.set("major", "Computer Science"); valid.set("interests", "Hiking"); valid.set("avatar_url", "https://example.com/me.png");
  assert.deepEqual(validateProfile(valid).profile, { name: "Alex Student", major: "Computer Science", interests: "Hiking", avatar_url: "https://example.com/me.png" });
});

test("mutations reject absent and cross-site origins", () => {
  const original = process.env.APP_URL;
  process.env.APP_URL = "https://studycircle.example";
  try {
    assertSameOrigin(new Request("https://studycircle.example/api/auth/login", { headers: { origin: "https://studycircle.example" } }));
    for (const origin of [undefined, "https://evil.example", "null"]) {
      assert.throws(() => assertSameOrigin(new Request("https://studycircle.example/api/auth/login", { headers: origin ? { origin } : {} })));
    }
    assert.throws(() => assertSameOrigin(new Request("https://studycircle.example/api/auth/login", { headers: { origin: "https://studycircle.example", "sec-fetch-site": "cross-site" } })));
    assert.equal(applicationOrigin("https://attacker.example"), "https://studycircle.example");
  } finally { if (original === undefined) delete process.env.APP_URL; else process.env.APP_URL = original; }
});

test("JSON parsing bounds actual bytes and rejects non-objects and malformed input", async () => {
  const req = (body: string, contentType = "application/json") => new Request("https://example.com", { method: "POST", headers: { "Content-Type": contentType }, body });
  assert.deepEqual(await readJson(req('{"email":"test@calpoly.edu"}')), { email: "test@calpoly.edu" });
  for (const body of ["null", "[]", "invalid", '"string"', JSON.stringify({ value: "x".repeat(8192) })]) await assert.rejects(readJson(req(body)));
  await assert.rejects(readJson(req("{}", "text/plain")));
});
