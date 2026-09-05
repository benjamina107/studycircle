import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chatService, DEMO_USER_ID } from './mock-service.ts';

const storage = new Map();
beforeEach(() => {
  storage.clear();
  globalThis.window = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
});
const channelId = 'prof-khosmood-general';
const input = (requestId, body = 'Study together?') => ({ channelId, requestId, body });

test('persists a message, derives demo author, and deduplicates retries', async () => {
  const sent = await chatService.sendMessage(input('retry-1'));
  assert.equal(sent.authorId, DEMO_USER_ID);
  assert.deepEqual(await chatService.sendMessage(input('retry-1')), sent);
  assert.equal((await chatService.listMessages(channelId)).filter(m => m.requestId === 'retry-1').length, 1);
  await assert.rejects(chatService.sendMessage(input('retry-1', 'Changed draft')), /different message/);
});

test('keeps channels separate and rejects unknown channels and invalid bodies', async () => {
  await chatService.sendMessage(input('one'));
  assert.deepEqual(await chatService.listMessages('prof-workman-homework'), []);
  await assert.rejects(chatService.listMessages('invented'), /unavailable/);
  await assert.rejects(chatService.sendMessage(input('empty', '  ')), /2,000/);
  await assert.rejects(chatService.sendMessage(input('long', 'x'.repeat(2001))), /2,000/);
});

test('enforces demo limit while allowing an idempotent retry at the limit', async () => {
  for (let i = 0; i < 10; i++) await chatService.sendMessage(input(`limit-${i}`));
  await assert.rejects(chatService.sendMessage(input('overflow')), /posting limit/);
  assert.equal((await chatService.sendMessage(input('limit-0'))).requestId, 'limit-0');
});

test('offline and aborted requests do not save messages', async () => {
  navigator.onLine = false;
  await assert.rejects(chatService.sendMessage(input('offline')), /offline/);
  navigator.onLine = true;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(chatService.sendMessage(input('aborted'), controller.signal), { name: 'AbortError' });
  assert.equal(storage.size, 0);
});

test('storage failures surface and do not pretend the message was sent', async () => {
  window.localStorage.setItem = () => { throw new Error('Storage full'); };
  await assert.rejects(chatService.sendMessage(input('full')), /Storage full/);
  assert.equal((await chatService.listMessages(channelId)).length, 2);
});

test('overview pins reference existing enrolled channels and callers cannot mutate fixtures', async () => {
  const overview = await chatService.getChatsOverview();
  assert.ok(overview.meetups.every(pin => overview.channels.some(channel => channel.id === pin.channelId)));
  overview.channels.length = 0;
  assert.equal((await chatService.getChatsOverview()).channels.length, 9);
});
