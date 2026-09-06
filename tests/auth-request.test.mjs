import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthRequest } from '../src/lib/auth-request.ts';

test('rapid keyboard/click submissions produce only one request and allow retry afterward', async () => {
  let finish, calls = 0;
  const run = createAuthRequest(async () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = run('/api/auth/login', { email: 'test@calpoly.edu' });
  assert.equal(await run('/api/auth/login', {}), null);
  assert.equal(calls, 1);
  finish(Response.json({ next: '/profile' }));
  assert.deepEqual(await first, { next: '/profile' });
  const retry = run('/api/auth/login', {});
  finish(Response.json({ error: 'Check your email and password.' }, { status: 401 }));
  await assert.rejects(retry, /Check your email/);
  assert.equal(calls, 2);
});
test('timeout releases the gate without automatic retries or false success', async () => {
  let calls = 0;
  const run = createAuthRequest(async (_url, { signal }) => {
    calls++;
    if (calls > 1) return Response.json({ message: 'Check your inbox.' });
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  }, 10);
  await assert.rejects(run('/api/auth/signup', {}), /may have completed/);
  assert.equal(calls, 1);
  assert.deepEqual(await run('/api/auth/signup', {}), { message: 'Check your inbox.' });
});
test('network, non-JSON, empty and failed responses produce recoverable failures', async () => {
  const network = createAuthRequest(async () => { throw new TypeError('secret transport details'); });
  await assert.rejects(network('/api/auth/logout'), /Check your connection/);
  for (const response of [new Response('<html>stack trace</html>', { status: 502 }), Response.json(null), Response.json({})]) {
    await assert.rejects(createAuthRequest(async () => response)('/api/auth/login', {}), /Please try again shortly/);
  }
});
test('leaving an auth form cancels its request without a late navigation or error', async () => {
 let finish;
 const run=createAuthRequest(async()=>new Promise(resolve=>{finish=resolve;}));
 const pending=run('/api/auth/login',{});
 run.cancel();
 finish(Response.json({next:'/profile'}));
 assert.equal(await pending,null);
});
test('login timeout does not tell students to look for an email',async()=>{
 const run=createAuthRequest(async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))),5);
 await assert.rejects(run('/api/auth/login',{}),/Login took too long/);
});
