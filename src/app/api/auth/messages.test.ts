import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { apiError } from "./_utils";
import { applicationOrigin, assertSameOrigin, readJson } from "./validation";

const load = createRequire(import.meta.url);

test("auth routes and pages offer recovery without exposing account or service details", async (t) => {
  // Replace only the server boundary; exercise the real handlers without network calls.
  const originalOrigin = process.env.APP_URL;
  process.env.APP_URL = "https://studycircle.example";
  const replaced = new Map<string, NodeModule | undefined>();
  function stub(path: string, exports: unknown) {
    const id = load.resolve(path);
    replaced.set(id, load.cache[id]);
    const stubModule = new Module(id);
    stubModule.exports = exports;
    stubModule.loaded = true;
    load.cache[id] = stubModule;
  }
  let result: unknown;
  let failure: Error | undefined;
  let configured = false;
  let signouts = 0;
  const respond = async () => { if (failure) throw failure; return result; };
  stub("../../../lib/supabase/server", { createClient: async () => ({ auth: {
    signUp: respond, resend: respond, signInWithPassword: respond,
    verifyOtp: respond, exchangeCodeForSession: respond,
    signOut: async () => { signouts++; return { error: null }; },
  } }) });
  stub("../../../lib/supabase/config", { isSupabaseConfigured: () => configured });
  stub("../../../components/AuthForm", () => null);
  stub("../../../components/AuthVerify", () => null);
  let sequence = 0;
  const request = (route: string, fields = {}) => new Request(`https://studycircle.example/api/auth/${route}`, {
    method: "POST", headers: { origin: "https://studycircle.example", "Content-Type": "application/json" },
    body: JSON.stringify({ email: `student${sequence++}@calpoly.edu`, password: "a long password", name: "Student", ...fields }),
  });
  const error = (code: string, status = 400) => ({ code, status, message: "Supabase secret provider configuration" });
  const failed = (code: string, status = 400) => ({ error: error(code, status), data: { user: null, session: null } });
  async function snapshot(response: Response) {
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    const body = await response.json();
    assert.doesNotMatch(JSON.stringify(body), /supabase|provider|configuration|JSON|request body/i);
    return { status: response.status, body };
  }
  try {
    const signup = load("./signup/route").POST;
    const resend = load("./resend/route").POST;
    const login = load("./login/route").POST;
    const verify = load("./verify/route").POST;
    const callback = load("./callback/route").GET;

    await t.test("signup masks existing accounts with the same accepted response", async () => {
      result = { error: null, data: { user: null, session: null } };
      const accepted = await snapshot(await signup(request("signup")));
      assert.equal(accepted.status, 202);
      assert.match(accepted.body.message, /Check your inbox and spam folder.*If you already have an account/);
      assert.doesNotMatch(accepted.body.message, /you’ll receive|we.ve sent|email sent/i);
      for (const code of ["user_already_exists", "email_exists"]) {
        result = failed(code);
        assert.deepEqual(await snapshot(await signup(request("signup"))), accepted);
      }
      result = failed("unexpected_failure", 500);
      const unavailable = await snapshot(await signup(request("signup")));
      assert.equal(unavailable.status, 503);
      assert.match(unavailable.body.error, /try again shortly/);
      result = failed("over_request_rate_limit", 429);
      assert.equal((await snapshot(await signup(request("signup")))).status, 429);
    });

    await t.test("signup still signs out and fails closed for immediate sessions", async () => {
      result = { error: null, data: { session: {}, user: {} } };
      const before = signouts;
      const response = await snapshot(await signup(request("signup")));
      assert.equal(signouts, before + 1);
      assert.equal(response.status, 503);
      assert.match(response.body.error, /try again later/);
    });

    await t.test("resend masks account state while retaining operational failures", async () => {
      result = { error: null };
      const accepted = await snapshot(await resend(request("resend")));
      assert.equal(accepted.status, 200);
      assert.match(accepted.body.message, /Check your inbox and spam folder.*If you already confirmed/);
      assert.doesNotMatch(accepted.body.message, /you’ll receive|we.ve sent|email sent/i);
      for (const code of ["user_not_found", "email_not_confirmed", "email_exists", "user_already_exists"]) {
        result = failed(code);
        assert.deepEqual(await snapshot(await resend(request("resend"))), accepted);
      }
      result = failed("unexpected_failure", 500);
      const response = await snapshot(await resend(request("resend")));
      assert.equal(response.status, 503);
      assert.match(response.body.error, /try again shortly/);
    });

    await t.test("login uses identical failures for missing, incorrect and unconfirmed accounts", async () => {
      result = failed("invalid_credentials");
      const expected = await snapshot(await login(request("login")));
      assert.equal(expected.status, 401);
      for (const code of ["user_not_found", "email_not_confirmed"]) {
        result = failed(code);
        assert.deepEqual(await snapshot(await login(request("login"))), expected);
      }
      result = { error: null, data: { user: {}, session: {} } };
      const before = signouts;
      assert.deepEqual(await snapshot(await login(request("login"))), expected);
      assert.equal(signouts, before + 1);
    });

    await t.test("confirmation only mentions expiry for a known link error", async () => {
      const fields = { token_hash: "a".repeat(32), type: "signup" };
      for (const code of ["unknown_future_error"]) {
        result = failed(code);
        const response = await snapshot(await verify(request("verify", fields)));
        assert.equal(response.status, 400);
        assert.doesNotMatch(response.body.error, /expired|already used/);
        assert.match(response.body.error, /try again shortly/);
      }
      result = failed("otp_expired");
      assert.match((await snapshot(await verify(request("verify", fields)))).body.error, /invalid or has expired/);
      result = { error: null, data: { user: { email_confirmed_at: "today", email: "student@calpoly.edu" } } };
      assert.deepEqual((await snapshot(await verify(request("verify", fields)))).body, { next: "/profile" });
      result = { error: null, data: { user: { email_confirmed_at: "today", email: "student@example.com" } } };
      const before = signouts;
      assert.equal((await snapshot(await verify(request("verify", fields)))).status, 403);
      assert.equal(signouts, before + 1);
    });

    await t.test("thrown errors stay private and callback failures stay recoverable", async () => {
      failure = new Error("Supabase secret configuration");
      try {
        const response = await snapshot(await signup(request("signup")));
        assert.equal(response.status, 503);
        assert.match(response.body.error, /try again shortly/);
        const redirect = await callback(new Request("https://studycircle.example/api/auth/callback?code=example"));
        assert.equal(redirect.status, 307);
        assert.equal(redirect.headers.get("location"), "https://studycircle.example/verify?error=confirmation");
      } finally { failure = undefined; }
      process.env.APP_URL = "ftp://invalid.example";
      try {
        assert.equal((await snapshot(await callback(new Request("https://studycircle.example/api/auth/callback")))).status, 503);
      } finally { process.env.APP_URL = "https://studycircle.example"; }
    });

    await t.test("operational errors remain distinct from credentials across all handlers", async () => {
      for (const handler of [signup, resend, login, verify]) {
        for (const [code, status, expected] of [["network_failure", 0, 503], ["unexpected_failure", 500, 503], ["over_email_send_rate_limit", 429, 429]] as const) {
          result = failed(code, status);
          const response = await snapshot(await handler(request("test", { token_hash: "a".repeat(32), type: "email" })));
          assert.equal(response.status, expected);
          assert.doesNotMatch(response.body.error, /password|expired/);
        }
      }
    });

    await t.test("successful login, verification, callback and logout keep their intended destinations", async () => {
      result = { error: null, data: { user: { email: "student@calpoly.edu", email_confirmed_at: "today" }, session: {} } };
      assert.deepEqual((await snapshot(await login(request("login")))).body, { next: "/profile" });
      assert.deepEqual((await snapshot(await verify(request("verify", { token_hash: "a".repeat(32), type: "email" })))).body, { next: "/profile" });
      const redirect = await callback(new Request("https://studycircle.example/api/auth/callback?code=test"));
      assert.equal(redirect.headers.get("location"), "https://studycircle.example/profile");
      const logout = load("./logout/route").POST;
      assert.deepEqual((await snapshot(await logout(request("logout")))).body, { next: "/login" });
    });

    await t.test("verification rejects unsupported recovery tokens and clears unconfirmed sessions", async () => {
      assert.equal((await snapshot(await verify(request("verify", { token_hash: "a".repeat(32), type: "recovery" })))).status, 400);
      result = { error: null, data: { user: {}, session: {} } };
      const before = signouts;
      assert.equal((await snapshot(await verify(request("verify", { token_hash: "a".repeat(32), type: "email" })))).status, 400);
      assert.equal(signouts, before + 1);
    });

    await t.test("unavailable pages and callback alert give plain next steps", async () => {
      const pages = [load("../../(auth)/login/page").default, load("../../(auth)/signup/page").default, load("../../(auth)/verify/page").default];
      for (const page of pages) {
        const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }));
        assert.match(html, /role="status"/);
        assert.match(html, /try again later/);
        assert.doesNotMatch(html, /supabase|configur|site owner/i);
      }
      configured = true;
      const html = renderToStaticMarkup(await pages[2]({ searchParams: Promise.resolve({ error: "secret provider details" }) }));
      assert.match(html, /role="alert"/);
      assert.match(html, /request another email/);
      assert.doesNotMatch(html, /expired|been used|secret provider details/);
    });
  } finally {
    for (const [id, original] of replaced) { if (original) load.cache[id] = original; else delete load.cache[id]; }
    if (originalOrigin === undefined) delete process.env.APP_URL; else process.env.APP_URL = originalOrigin;
  }
});

test("request validation retains statuses and gives plain recovery instructions", async () => {
  const cases: [() => unknown, number, RegExp][] = [
    [() => readJson(new Request("https://example.com", { method: "POST", body: "{}" })), 415, /Refresh the page/],
    [() => readJson(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" } })), 400, /submission was empty/],
    [() => readJson(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" }, body: "invalid" })), 400, /Refresh the page/],
    [() => readJson(new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(8193) })), 413, /Shorten your entries/],
    [() => assertSameOrigin(new Request("https://example.com")), 403, /Open StudyCircle/],
    [() => applicationOrigin("ftp://invalid.example"), 503, /try again later/],
  ];
  for (const [run, status, message] of cases) {
    let caught: unknown;
    try { await run(); } catch (error) { caught = error; }
    assert.ok(caught);
    const response = apiError(caught);
    assert.equal(response.status, status);
    assert.match((await response.json()).error, message);
  }
});
