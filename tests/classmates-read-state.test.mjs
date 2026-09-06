import {test} from 'node:test';
import assert from 'node:assert/strict';
import {require as tsxRequire} from 'tsx/cjs/api';
const {markMessagesRead}=tsxRequire('../src/components/classmates/read-state.ts',import.meta.url);

test('only confirmed newly read IDs update the badge for the correct peer',async()=>{
 const updates=[];
 await markMessagesRead('/api/classmates','peer',['a','b'],async()=>({readIds:['a','outside-request']}),(peer,ids)=>updates.push({peer,ids}));
 await markMessagesRead('/api/classmates','peer',['a'],async()=>({readIds:[]}),(peer,ids)=>updates.push({peer,ids}));
 assert.deepEqual(updates,[{peer:'peer',ids:['a']},{peer:'peer',ids:[]}]);
});

test('read callback runs only after a successful PATCH',async()=>{
 let calls=0,reads=0;
 const request=async(_url,options)=>{calls++;assert.equal(options.method,'PATCH');return {ok:true};};
 await markMessagesRead('/api/classmates','peer',['message'],request,()=>{reads++;});
 assert.equal(calls,1);assert.equal(reads,1);
 await assert.rejects(markMessagesRead('/api/classmates','peer',['message'],async()=>{throw new Error('failed');},()=>{reads++;}));
 assert.equal(reads,1);
});

test('aborted read does not refresh the directory',async()=>{
 const controller=new AbortController();let reads=0;
 controller.abort();
 await markMessagesRead('/api/classmates','peer',['message'],async()=>{},()=>{reads++;},controller.signal);
 assert.equal(reads,0);
});
