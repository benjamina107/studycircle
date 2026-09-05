import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthEmail } from '../scripts/check-auth-email.mjs';

const options = { url: 'https://test.supabase.co', key: 'sb_publishable_test', email: 'student@calpoly.edu', send: true };
const enabled = { external: { email: true }, mailer_autoconfirm: false };
test('email smoke test requires explicit send consent and campus recipient before any request', async () => {
  const request = () => { throw new Error('Must not make a request'); };
  await assert.rejects(checkAuthEmail({ ...options, send: false }, request), /authorize/);
  await assert.rejects(checkAuthEmail({ ...options, email: 'student@example.com' }, request), /Cal Poly/);
  await assert.rejects(checkAuthEmail({ ...options, key: 'sb_secret_test' }, request), /publishable/);
});
test('email smoke test refuses disabled verification', async () => {
  await assert.rejects(checkAuthEmail(options, async () => Response.json({ ...enabled, mailer_autoconfirm: true })), /confirmation/);
});
test('accepted resend is not falsely reported as delivered', async () => {
  const calls = [];
  const result = await checkAuthEmail(options, async (url, init) => {
    calls.push({ url, init });
    return Response.json(calls.length === 1 ? enabled : {});
  });
  assert.deepEqual(result, { accepted: true, delivered: false });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.pathname, '/auth/v1/resend');
  assert.deepEqual(JSON.parse(calls[1].init.body), { type: 'signup', email: options.email });
});
for (const status of [429, 500]) {
  test(`email smoke test fails HTTP ${status} without retries`, async () => {
    let count = 0;
    await assert.rejects(checkAuthEmail(options, async () => ++count === 1
      ? Response.json(enabled) : new Response('', { status })), status === 429 ? /rate limit/ : /failed/);
    assert.equal(count, 2);
  });
}
