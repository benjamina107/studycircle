import assert from 'node:assert/strict';

// Run against `npm run dev`. No cookies, valid credentials, or usable tokens are sent.
// Invalid inputs must be rejected before reaching Supabase signup or email APIs.
const origin = 'http://localhost:3000';
let checks = 0;
async function check(path, status, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options, redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status, `${options.method || 'GET'} ${path}`);
  if (status >= 400) {
    const body = await response.clone().json();
    assert.equal(typeof body.error, 'string', 'Errors need a readable message');
    assert.doesNotMatch(body.error, /supabase|prisma|\.env|stack trace|SQLSTATE|publishable key/i);
  }
  checks++;
  return response;
}
for (const path of ['/profile', '/spaces', '/chats', '/settings']) {
  const response = await check(path, 307);
  assert.equal(new URL(response.headers.get('location'), origin).pathname, '/login');
}
for (const path of ['/login', '/signup', '/verify', '/preview/chat', '/preview/meetups']) {
  await check(path, 200);
}
for (const route of ['signup', 'login', 'resend', 'verify', 'logout']) {
  for (const badOrigin of [undefined, 'https://untrusted.example']) {
    const response = await check(`/api/auth/${route}`, 403, {
      method: 'POST', body: '{}',
      headers: { 'Content-Type': 'application/json', ...(badOrigin ? { Origin: badOrigin } : {}) },
    });
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
}
const headers = { Origin: origin, 'Content-Type': 'application/json' };
for (const route of ['signup', 'login', 'resend']) {
  await check(`/api/auth/${route}`, 400, {
    method: 'POST', headers, body: JSON.stringify({ email: 'invalid@example.com' }),
  });
}
await check('/api/auth/signup', 400, { method: 'POST', headers, body: '{' });
await check('/api/auth/signup', 413, { method: 'POST', headers, body: 'x'.repeat(8193) });
await check('/api/auth/verify', 400, { method: 'POST', headers, body: JSON.stringify({ token_hash: 'invalid', type: 'email' }) });
const callback = await check('/api/auth/callback', 307);
assert.equal(new URL(callback.headers.get('location')).pathname, '/verify');
assert.equal(callback.headers.get('referrer-policy'), 'no-referrer');
console.log(`PASS: ${checks} auth HTTP checks; no accounts created or emails requested.`);
