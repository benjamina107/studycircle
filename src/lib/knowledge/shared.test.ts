import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quizletText,splitPassages,diversePassages,hasMention} from './shared';
import {validateFile} from './files';
test('Quizlet export emits exactly two fields per row, escaping content separators',()=>{
 const text=quizletText([{question:'Q\t1\nnext',answer:'A\r\nline'},{question:' Q2 ',answer:' A2 '}]);
 assert.equal(text,'Q 1 next\tA line\nQ2\tA2');assert.ok(text.split('\n').every(r=>r.split('\t').length===2));
});
test('passages retain source locators and end of long material',()=>{
 const text='hello '.repeat(1000)+'FINAL';const parts=splitPassages([{content:text,locator:'Page 7'}]);
 assert.ok(parts.length>1);assert.ok(parts.every(p=>p.content.length<=2200&&p.locator==='Page 7'));assert.ok(parts.at(-1)?.content.endsWith('FINAL'));
});
test('retrieval suppresses overlap and includes complementary material',()=>{
 const rows=[{id:'1',asset_id:'a',score:1,content:'linked lists contain nodes and pointers',locator:'p1'},{id:'2',asset_id:'b',score:.99,content:'Linked lists contain nodes and pointers!',locator:'image'},{id:'3',asset_id:'a',score:.9,content:'Insertion at a known head is constant time',locator:'p2'},{id:'4',asset_id:'c',score:.8,content:'A diagram shows how the previous pointer changes',locator:'image'}];
 const result=diversePassages(rows,3);assert.equal(result.length,3);assert.ok(!result.some(r=>r.id==='2'));assert.equal(result[1].id,'4');
});
test('mentions require a boundary and accept both names',()=>{
 assert.ok(hasMention('@AI make cards'));assert.ok(hasMention('hey @ClassAI explain'));assert.ok(!hasMention('hello@ai.com'));assert.ok(!hasMention('@airplane'));
});
test('uploads reject video, disguised files and non-text bytes',async()=>{
 await assert.rejects(validateFile('movie.mp4',Buffer.from('anything')),/Video/);
 await assert.rejects(validateFile('notes.pdf',Buffer.from('not a pdf')),/match/);
 await assert.rejects(validateFile('notes.txt',Buffer.from([0,1,2])),/UTF-8/);
 assert.equal(await validateFile('notes.md',Buffer.from('# Class notes')),'text/plain');
});

test('retrieval keeps contradictions even when the surrounding text overlaps',()=>{
 const base='These notes discuss a linked list in detail with many identical surrounding words. ';
 const rows=['Insertion is O(1).','Insertion is not O(1).','Insertion is O(n).'].map((text,i)=>({id:String(i),asset_id:String(i),score:1,locator:'p1',content:base+text}));
 assert.equal(diversePassages(rows).length,3);
});
