import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require as tsxRequire } from 'tsx/cjs/api';
const { requestFileJson, fileClientMessage } = tsxRequire('../src/features/files/client.ts',import.meta.url);

test('client hides network and JSON internals but preserves safe API messages', async () => {
  const original=globalThis.fetch;
  const fallback='Files are temporarily unavailable. Please try again later.';
  try {
    for (const implementation of [async () => { throw new TypeError('Failed to fetch internal-provider.example'); },async () => new Response('<html>proxy error</html>',{status:502}),async () => Response.json(null)]) {
      globalThis.fetch=implementation;
      await assert.rejects(requestFileJson('/api/class-files',{},fallback),error => fileClientMessage(error,'wrong')===fallback);
    }
    globalThis.fetch=async () => Response.json({error:'Choose a valid class.'},{status:400});
    await assert.rejects(requestFileJson('/api/class-files',{},fallback),error => fileClientMessage(error,'wrong')==='Choose a valid class.');
    assert.equal(fileClientMessage(new SyntaxError('Unexpected token'),fallback),fallback);
    globalThis.fetch=async () => Response.json({files:[],hasMore:false,nextCursor:null});
    assert.deepEqual(await requestFileJson('/api/class-files',{},fallback),{files:[],hasMore:false,nextCursor:null});
  } finally { globalThis.fetch=original; }
});
