import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
import { register } from 'tsx/cjs/api';
register();
const { createChatHandlers } = await tsImport('../src/features/class-chat/server.ts', import.meta.url);
const { sendPending } = await tsImport('../src/features/class-chat/client.ts', import.meta.url);
const fileId = '00000000-0000-0000-0000-000000000010';
const file = { id: fileId, name: 'Homework.pdf', size: 1200, mime_type: 'application/pdf', subspace_id: 'sub1', uploader_id: 'user1', created_at: '2026-09-05T00:00:00Z' };

function setup(options = {}) {
  const tables = { channels: [{ id: 'ch1', subspace_id: 'sub1', name: 'general' }], class_files: [file, { ...file, id: '00000000-0000-0000-0000-000000000020', subspace_id: 'sub2' }], messages: [] };
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: options.user === undefined ? { id: 'user1', email: 'one@calpoly.edu', email_confirmed_at: 'today' } : options.user }, error: null }) },
    rpc: async (name, input) => { calls.push({ name, input }); return { data: options.member !== false, error: null }; },
    from(table) {
      const filters = []; let insert; let single = false;
      const query = {
        select() { return query; }, eq(key, value) { filters.push((row) => row[key] === value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        order() { return query; }, limit() { return query; },
        insert(value) { insert = value; return query; },
        maybeSingle() { single = true; return query; }, single() { single = true; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            calls.push({ table, insert });
            if (table === 'messages' && options.schemaError) return { data: null, error: { code: '42703', message: 'secret database detail' } };
            if (insert) {
              const row = { ...insert, created_at: '2026-09-05T00:00:00Z' };
              if (options.insertError) {
                if (options.committed) tables.messages.push(row);
                return { data: null, error: { code: options.insertError } };
              }
              tables.messages.push(row); return { data: row, error: null };
            }
            const rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
            return { data: single ? rows[0] ?? null : [...rows], error: null };
          }).then(resolve, reject);
        },
      }; return query;
    },
  };
  return { ...createChatHandlers(async () => db), tables, calls };
}
function post(input, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/chat/messages', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ channelId: 'ch1', requestId: 'retry1', body: 'Hello', ...input }) });
}

test('legacy GET stays an array; group GET resolves the channel; reads are not cached', async () => {
  const api = setup();
  const legacy = await api.GET(new Request('http://localhost:3000/api/chat/messages?channel=ch1'));
  assert.deepEqual(await legacy.json(), []);
  assert.equal(legacy.headers.get('cache-control'), 'no-store');
  const response = await api.GET(new Request('http://localhost:3000/api/chat/messages?subspaceId=sub1&channelName=general'));
  assert.deepEqual(await response.json(), { channel: { id: 'ch1', name: 'general' }, messages: [] });
  assert.ok(api.calls.some((call) => call.name === 'is_subspace_member' && call.input.target === 'sub1'));
});

test('rejects foreign or missing POST origins before accessing data', async () => {
  for (const origin of ['https://evil.test', '']) {
    const api = setup(); const response = await api.POST(post({}, origin));
    assert.equal(response.status, 403); assert.equal(api.calls.length, 0);
  }
});

test('requires authenticated verified Cal Poly users and explicit membership', async () => {
  for (const [options, status] of [[{ user: null }, 401], [{ user: { id: 'x', email: 'x@calpoly.edu' } }, 403], [{ user: { id: 'x', email: 'x@elsewhere.edu', email_confirmed_at: 'yes' } }, 403], [{ member: false }, 403]]) {
    const api = setup(options);
    assert.equal((await api.POST(post({}))).status, status);
    assert.equal((await api.GET(new Request('http://localhost:3000/api/chat/messages?channel=ch1'))).status, status);
    assert.equal(api.tables.messages.length, 0);
  }
});

test('file-only messages derive filename and identity, and retry without duplication', async () => {
  const api = setup();
  const input = { body: ' ', file_id: fileId, author_id: 'forged', authorId: 'forged', created_at: '2000' };
  const response = await api.POST(post(input)); assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.body, file.name); assert.equal(message.authorId, 'user1'); assert.deepEqual(message.file, file);
  assert.equal((await api.POST(post(input))).status, 200); assert.equal(api.tables.messages.length, 1);
  assert.equal((await api.POST(post({ body: file.name }))).status, 409);
});

test('rejects files from another class without inserting and filters GET metadata', async () => {
  const api = setup(); const foreign = api.tables.class_files[1];
  assert.equal((await api.POST(post({ file_id: foreign.id }))).status, 404);
  assert.equal(api.tables.messages.length, 0);
  api.tables.messages.push({ id: 'old', channel_id: 'ch1', author_id: 'user1', body: 'old', file_id: foreign.id, created_at: 'today' });
  const data = await (await api.GET(new Request('http://localhost:3000/api/chat/messages?channel=ch1'))).json();
  assert.equal(data[0].file, null);
});

test('schema errors are readable and never include internal errors', async () => {
  const api = setup({ schemaError: true });
  for (const response of [await api.POST(post({})), await api.GET(new Request('http://localhost:3000/api/chat/messages?channel=ch1'))]) {
    assert.equal(response.status, 503);
    const value = await response.text(); assert.match(value, /temporarily unavailable/); assert.doesNotMatch(value, /secret|database|schema|Supabase/);
  }
});

test('invalid input never inserts and foreign GET origin is rejected', async () => {
  const api = setup();
  for (const input of [{ body: '' }, { body: 'x'.repeat(2001) }, { body: {} }, { file_id: 'not-a-uuid' }, { file_id: {} }, { requestId: '' }]) {
    assert.equal((await api.POST(post(input))).status, 400);
  }
  assert.equal((await api.GET(new Request('http://localhost:3000/api/chat/messages?channel=ch1', { headers: { origin: 'https://evil.test' } }))).status, 403);
  assert.equal(api.tables.messages.length, 0);
});

test('anonymous verified identities are rejected', async () => {
  const api = setup({ user: { id: 'user1', email: 'one@calpoly.edu', email_confirmed_at: 'yes', is_anonymous: true } });
  assert.equal((await api.POST(post({}))).status, 403);
  assert.equal(api.calls.length, 0);
});

test('concurrent committed retry succeeds; rate limit stays readable', async () => {
  assert.equal((await setup({ insertError: '23505', committed: true }).POST(post({}))).status, 200);
  assert.equal((await setup({ insertError: '42900' }).POST(post({}))).status, 429);
});

test('uploaded file and request ID survive a failed send without a duplicate upload', async () => {
  const original = globalThis.fetch; const calls = []; let sends = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url === '/api/class-files') return Response.json({ file });
    if (++sends === 1) return Response.json({ error: 'Temporary failure' }, { status: 503 });
    return Response.json({ id: 'retry1', file });
  };
  try {
    const pending = { requestId: 'retry1', channelId: 'ch1', subspaceId: 'sub1', body: '', localFile: new File(['hi'], file.name), file: null, uploaded: false };
    await assert.rejects(sendPending(pending), /Temporary failure/);
    assert.equal(pending.uploaded, true); assert.equal(pending.file.id, fileId);
    await sendPending(pending);
    assert.equal(calls.filter((call) => call.url === '/api/class-files').length, 1);
    assert.equal(calls[1].init.body, calls[2].init.body);
    assert.equal(calls[0].init.body.get('subspaceId'), 'sub1');
  } finally { globalThis.fetch = original; }
});
