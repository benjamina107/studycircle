import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require as tsxRequire } from 'tsx/cjs/api';
const { saveUpload } = tsxRequire('../src/features/files/upload.ts', import.meta.url);
const row = { id:'11111111-1111-4111-8111-111111111111', name:'notes.pdf', size:5, mime_type:'application/pdf', uploader_id:'a', subspace_id:'sub1', object_path:'sub1/a/file.pdf' };
const saved = { ...row, created_at:'2026-09-05T00:00:00Z' };

function mock({ uploadError=false, insertError=false, found=null, lookupError=false, removeError=false, removed=true } = {}) {
  const calls = [];
  const client = {
    storage:{from(bucket) { assert.equal(bucket,'class-files'); return {
      async upload(path, bytes, options) { calls.push('upload'); assert.equal(path,row.object_path); assert.equal(options.upsert,false); return {error:uploadError ? new Error('upload failed') : null}; },
      async remove(paths) { calls.push('remove'); assert.deepEqual(paths,[row.object_path]); return {data:removed ? [{name:row.object_path}] : [],error:removeError ? new Error('cleanup failed') : null}; },
    }; }},
    from(table) { assert.equal(table,'class_files'); return {
      insert() { calls.push('insert'); return {select() { return {async single() { return {data:insertError ? null : saved,error:insertError ? new Error('insert failed') : null}; }}; }}; },
      select() { return {eq() { return {async maybeSingle() { calls.push('lookup'); return {data:found,error:lookupError ? new Error('lookup failed') : null}; }}; }}; },
    }; },
  };
  return {client,calls};
}
test('successful upload returns metadata; never overwrites', async () => {
  const {client,calls}=mock(); assert.deepEqual(await saveUpload(client,row,new Uint8Array([1])),saved); assert.deepEqual(calls,['upload','insert']);
});
test('metadata failure removes object and accurately reports confirmed cleanup', async () => {
  const {client,calls}=mock({insertError:true}); await assert.rejects(saveUpload(client,row,new Uint8Array([1])), /temporary copy was removed/); assert.deepEqual(calls,['upload','insert','lookup','remove']);
});
test('lost metadata response recovers committed file without deleting it', async () => {
  const {client,calls}=mock({insertError:true,found:saved}); assert.deepEqual(await saveUpload(client,row,new Uint8Array([1])),saved); assert.deepEqual(calls,['upload','insert','lookup']);
});
test('failed or unconfirmed cleanup is not reported as successful', async () => {
  for (const options of [{insertError:true,removeError:true},{insertError:true,removed:false},{insertError:true,lookupError:true},{uploadError:true,removed:false}]) {
    const {client,calls}=mock(options);
    await assert.rejects(saveUpload(client,row,new Uint8Array([1])), /couldn’t confirm whether your file was saved or whether its temporary copy was removed/);
    if (options.lookupError) assert.ok(!calls.includes('remove'));
    if (options.uploadError) assert.ok(!calls.includes('insert'));
  }
});
