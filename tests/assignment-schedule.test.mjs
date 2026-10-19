import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/assignment-schedule.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseScheduleUpdate,ScheduleError}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const now=Date.parse('2026-10-19T12:00:00.000Z'),past='2026-10-18T12:00:00.000Z',future='2026-10-20T12:00:00.000Z';
test('expired assignments require a future deadline or explicit unlimited choice to reopen',()=>{
  assert.throws(()=>parseScheduleUpdate({closed:false},{closed:0,deadline:past},now),/取消截止时间/);
  assert.deepEqual(parseScheduleUpdate({closed:false,deadline:future},{closed:1,deadline:past},now),{closed:false,deadline:future});
  assert.deepEqual(parseScheduleUpdate({closed:false,deadline:null},{closed:1,deadline:past},now),{closed:false,deadline:null});
});
test('deadline-only edits leave manual stop state untouched',()=>{
  assert.deepEqual(parseScheduleUpdate({deadline:future},{closed:1,deadline:past},now),{deadline:future});
  assert.deepEqual(parseScheduleUpdate({deadline:null},{closed:1,deadline:past},now),{deadline:null});
});
test('manual stop and restore preserve a valid existing deadline',()=>{
  assert.deepEqual(parseScheduleUpdate({closed:true},{closed:0,deadline:past},now),{closed:true});
  assert.deepEqual(parseScheduleUpdate({closed:false},{closed:1,deadline:future},now),{closed:false});
  assert.deepEqual(parseScheduleUpdate({closed:false},{closed:1,deadline:null},now),{closed:false});
});
test('past, boundary, malformed, normalized impossible dates and wrong types are rejected',()=>{
  for(const deadline of [past,new Date(now).toISOString(),'bad date','2030-02-30T12:00:00.000Z','',123,true,[],{}])assert.throws(()=>parseScheduleUpdate({deadline},{closed:0,deadline:null},now),ScheduleError);
});
test('empty and unexpected patches fail without mutating an assignment',()=>{
  for(const input of [null,[],{},'open',{closed:0},{owner:'someone'},{closed:false,title:'changed'}])assert.throws(()=>parseScheduleUpdate(input,{closed:0,deadline:null},now),ScheduleError);
});
