import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';

const { validateFile, validateContents, validSubspaceId, validFileId, readMultipart, MAX_REQUEST_SIZE } = await tsImport('../src/features/files/validation.ts', import.meta.url);

test('reject unsafe names, sizes, extensions, MIME mismatches, and forged content', () => {
  const file = { name:'notes.pdf', size:5, type:'application/pdf' };
  assert.deepEqual(validateFile(file), {extension:'pdf',mime:'application/pdf'});
  assert.equal(validateFile({...file,name:'NOTES.PDF',type:''}).mime,'application/pdf');
  for (const name of ['../notes.pdf','x/y.pdf','x\\y.pdf','.pdf','x\n.pdf','x\u202e.pdf',' notes.pdf','a'.repeat(181)+'.pdf','notes.html','x.svg']) {
    assert.throws(() => validateFile({...file,name}));
  }
  for (const size of [0,-1,NaN,Infinity,1.5,10485761]) assert.throws(() => validateFile({...file,size}));
  assert.throws(() => validateFile({...file,type:'text/html'}));
  for (const id of ['', '../sub', 'sub/1','sub%2F1','x'.repeat(129)]) assert.equal(validSubspaceId(id),false);
  assert.equal(validSubspaceId('csc-202_prof1'),true);
  assert.equal(validFileId('11111111-1111-4111-8111-111111111111'),true);
  assert.equal(validFileId('../111'),false);
  validateContents(new TextEncoder().encode('%PDF-1.7'), 'application/pdf');
  validateContents(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png');
  validateContents(new Uint8Array([255,216,255]), 'image/jpeg');
  validateContents(new TextEncoder().encode('Lecture notes\nHello, world\t✓'), 'text/plain');
  for (const mime of ['application/pdf','image/png','image/jpeg']) assert.throws(() => validateContents(new TextEncoder().encode('<script>bad</script>'),mime));
  assert.throws(() => validateContents(new Uint8Array([0]),'text/plain'));
  assert.throws(() => validateContents(new Uint8Array([255,255]),'text/csv'));
});

test('multipart parser enforces actual bytes without trusting Content-Length', async () => {
  const form = new FormData(); form.set('subspaceId','sub1'); form.set('file',new File(['hello'],'notes.txt',{type:'text/plain'}));
  const parsed = await readMultipart(new Request('http://localhost/api/class-files',{method:'POST',body:form}));
  assert.equal(parsed.get('subspaceId'),'sub1');
  assert.equal(await parsed.get('file').text(),'hello');
  await assert.rejects(readMultipart(new Request('http://localhost',{method:'POST',body:'bad'})), /read your upload/);
  await assert.rejects(readMultipart(new Request('http://localhost',{method:'POST',body:'bad',headers:{'content-type':'multipart/form-data; boundary=x'}})), /read your upload/);
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_REQUEST_SIZE + 1)); }, cancel() { cancelled=true; } });
  await assert.rejects(readMultipart(new Request('http://localhost',{method:'POST',body:stream,duplex:'half',headers:{'content-type':'multipart/form-data; boundary=x','content-length':'1'}})), error => error.status===413);
  assert.equal(cancelled,true);
});
