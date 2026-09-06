import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { require as tsxRequire } from 'tsx/cjs/api';

const uid = '00000000-0000-0000-0000-000000000001';
const id = '11111111-1111-4111-8111-111111111111';
const file = {id,name:'notes.pdf',size:5,mime_type:'application/pdf',created_at:'2026-09-05T00:00:00Z',uploader_id:uid,subspace_id:'sub1'};
let settings;
let calls;
function reset(overrides = {}) { process.env.APP_URL = 'http://localhost'; settings = {configured:true,member:true,user:{id:uid,email:'a@calpoly.edu',email_confirmed_at:'2026-01-01'},...overrides}; calls = []; }
const client = {
  auth: {async getUser() { calls.push('auth'); return {data:{user:settings.user},error:null}; }},
  async rpc(name, args) { calls.push(['membership',name,args]); return {data:settings.member,error:settings.memberError}; },
  storage:{from(bucket) { calls.push(['bucket',bucket]); return {
    async upload(path, bytes, options) { calls.push(['upload',path,bytes.length,options]); return {error:null}; },
    async createSignedUrl(path, ttl, options) { calls.push(['sign',path,ttl,options]); return {data:{signedUrl:'https://storage.example/signed?token=secret'},error:settings.signError}; },
  }; }},
  from(table) {
    calls.push(['table',table]);
    let inserted;
    const query = {
      select(columns) { calls.push(['select',columns]); return query; },
      eq(key,value) { calls.push(['filter',key,value]); return query; },
      or(value) { calls.push(['cursor',value]); return query; },
      order() { return query; },
      limit(value) { calls.push(['limit',value]); return query; },
      insert(row) { inserted=row; calls.push(['insert',row]); return query; },
      async single() { const {object_path:_objectPath,...metadata}=inserted; return {data:{...metadata,created_at:file.created_at},error:null}; },
      async maybeSingle() { return {data:settings.missing ? null : {...file,object_path:settings.badPath || `sub1/${uid}/${id}.pdf`},error:null}; },
      then(resolve) { return Promise.resolve({data:settings.rows ?? [file],error:settings.listError}).then(resolve); },
    };
    return query;
  },
};

// Scoped to this test worker; production modules still use the real server-only SSR client.
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === 'server-only') return {};
  if (name === '@/lib/supabase/server') return {createClient:async () => client};
  if (name === '@/lib/supabase/config') return {isSupabaseConfigured:() => settings.configured};
  return originalLoad.call(this,name,...args);
};
const api = tsxRequire('../src/app/api/class-files/route.ts',import.meta.url);
const download = tsxRequire('../src/app/api/class-files/[id]/download/route.ts',import.meta.url);
Module._load = originalLoad;

const get = () => api.GET(new Request('http://localhost/api/class-files?subspaceId=sub1'));
const post = (name='notes.pdf', body='%PDF-', type='application/pdf', extras={}) => {
  const form = new FormData(); form.set('subspaceId','sub1'); form.set('file',new File([body],name,{type}));
  return api.POST(new Request('http://localhost/api/class-files',{method:'POST',body:form,headers:{origin:process.env.APP_URL},...extras}));
};
const getDownload = () => download.GET(new Request(`http://localhost/api/class-files/${id}/download`),{params:Promise.resolve({id})});

test('GET lists scoped metadata with private cache headers', async () => {
  reset(); const response=await get(); assert.equal(response.status,200); assert.deepEqual(await response.json(),{files:[file],hasMore:false,nextCursor:null});
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.ok(calls.some(c => Array.isArray(c) && c[0]==='filter' && c[1]==='subspace_id' && c[2]==='sub1'));
  assert.ok(calls.some(c => Array.isArray(c) && c[0]==='limit' && c[1]===201));
});
test('pagination remains bounded and preserves microseconds and the class filter', async () => {
  const dated={...file,created_at:'2026-09-05T12:00:00.123456+00:00'};
  reset({rows:Array.from({length:201},() => dated)});
  const first=await (await get()).json(); assert.equal(first.files.length,200); assert.equal(first.hasMore,true); assert.equal(first.nextCursor,`${dated.created_at}|${id}`);
  reset(); const params=new URLSearchParams({subspaceId:'sub1',cursor:first.nextCursor});
  const second=await (await api.GET(new Request(`http://localhost/api/class-files?${params}`))).json(); assert.equal(second.hasMore,false);
  assert.deepEqual(calls.find(c => Array.isArray(c) && c[0]==='cursor'),['cursor',`created_at.lt.${dated.created_at},and(created_at.eq.${dated.created_at},id.lt.${id})`]);
  assert.ok(calls.some(c => Array.isArray(c) && c[0]==='filter' && c[1]==='subspace_id' && c[2]==='sub1'));
  reset(); assert.equal((await api.GET(new Request('http://localhost/api/class-files?subspaceId=sub1&cursor=bad,filter'))).status,400);
});
test('all endpoints reject missing auth, unverified users, and nonmembers before storage', async () => {
  for (const operation of [get,post,getDownload]) for (const [overrides,status] of [[{user:null},401],[{user:{id:uid,email:'a@calpoly.edu'}},403],[{member:false},403],[{configured:false},503],[{memberError:{message:'down'}},503]]) {
    reset(overrides); const response=await operation(); assert.equal(response.status,status);
    assert.ok(!calls.some(c => Array.isArray(c) && c[0]==='bucket'));
  }
});
test('POST uploads private generated path then returns only public metadata', async () => {
  reset(); const response=await post(); assert.equal(response.status,201);
  const {file:saved}=await response.json(); assert.equal(saved.name,'notes.pdf'); assert.equal(saved.subspace_id,'sub1'); assert.equal(saved.uploader_id,uid); assert.equal(saved.object_path,undefined);
  const upload=calls.find(c => Array.isArray(c) && c[0]==='upload');
  assert.equal(upload[1],`sub1/${uid}/${saved.id}.pdf`); assert.equal(upload[3].upsert,false);
  assert.ok(calls.some(c => Array.isArray(c) && c[0]==='bucket' && c[1]==='class-files'));
});
test('POST rejects cross-origin requests, spoofed bytes, duplicate fields and unsafe scopes', async () => {
  reset(); assert.equal((await post('notes.pdf','%PDF-','application/pdf',{headers:{origin:'https://evil.example'}})).status,403); assert.deepEqual(calls,[]);
  reset(); assert.equal((await post('notes.pdf','<script>bad</script>')).status,415);
  assert.ok(!calls.some(c => Array.isArray(c) && c[0]==='bucket'));
  for (const duplicate of [true,false]) {
    reset(); const form=new FormData(); form.set('subspaceId',duplicate ? 'sub1' : '../sub1'); form.set('file',new File(['%PDF-'],'notes.pdf',{type:'application/pdf'}));
    if (duplicate) form.append('subspaceId','sub2');
    assert.equal((await api.POST(new Request('http://localhost/api/class-files',{method:'POST',body:form,headers:{origin:'http://localhost'}}))).status,400);
  }
});
test('POST requires canonical APP_URL Origin, including behind a proxy, with safe error copy', async () => {
  reset(); assert.equal((await post('notes.pdf','%PDF-','application/pdf',{headers:{}})).status,403);
  assert.deepEqual(calls,[]);
  reset(); process.env.APP_URL='https://studycircle.example';
  assert.equal((await post()).status,201, 'canonical Origin accepted even with an internal request host');
  reset(); process.env.APP_URL='https://studycircle.example';
  assert.equal((await post('notes.pdf','%PDF-','application/pdf',{headers:{origin:'http://localhost'}})).status,403);
  reset(); process.env.APP_URL='ftp://invalid.example';
  const invalidConfig=await post(); assert.equal(invalidConfig.status,503); assert.deepEqual(await invalidConfig.json(),{error:'Files are temporarily unavailable. Please try again later.'});
  reset({configured:false}); assert.deepEqual(await (await get()).json(),{error:'Files are temporarily unavailable. Please try again later.'});
  reset(); assert.deepEqual(await (await api.GET(new Request('http://localhost/api/class-files?subspaceId=../bad'))).json(),{error:'Choose a valid class.'});
});
test('downloads recheck membership and sign a 60-second attachment without caching', async () => {
  reset(); const response=await getDownload(); assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'https://storage.example/signed?token=secret');
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.deepEqual(calls.find(c => Array.isArray(c) && c[0]==='sign'),['sign',`sub1/${uid}/${id}.pdf`,60,{download:'notes.pdf'}]);
  for (const [overrides,status] of [[{missing:true},404],[{badPath:'../other/private.pdf'},503],[{signError:{message:'down'}},503]]) {
    reset(overrides); assert.equal((await getDownload()).status,status);
  }
});
