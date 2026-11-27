import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=ts.transpileModule(readFileSync(new URL('../lib/roster-draw.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const out={};runInNewContext(source,{exports:out,Math,Number,Set,Array,String,Error});
const {drawRoster,groupLabel}=out;
test('80 team terundi ke empat grup seimbang dengan ID unik',()=>{
  const teams=Array.from({length:80},(_,i)=>({id:i+1,teamName:`TEAM ${i+1}`}));
  const result=drawRoster(teams,4,()=>.5);
  assert.equal(result.length,80);
  assert.equal(new Set(result.map(row=>row.id)).size,80);
  assert.deepEqual(Array.from({length:4},(_,i)=>result.filter(row=>row.group===i).length),[20,20,20,20]);
  assert.equal(groupLabel(26),'AA');
});
test('jumlah grup dibatasi dan awalan team tersebar bila memungkinkan',()=>{
  const result=drawRoster([{id:1,teamName:'NO FAKE A'},{id:2,teamName:'NO FAKE B'},{id:3,teamName:'X TEAM'},{id:4,teamName:'Y TEAM'}],2,()=>.99);
  assert.notEqual(result.find(x=>x.id===1).group,result.find(x=>x.id===2).group);
  assert.throws(()=>drawRoster([{id:1,teamName:'a'}],51));
});

test('120 teams across six groups remain unique and balanced',()=>{
 const result=drawRoster(Array.from({length:120},(_,i)=>({id:i+1,teamName:`CLAN${i%20} TEAM${i+1}`})),6,()=>.73);
 assert.equal(new Set(result.map(r=>r.id)).size,120);assert.deepEqual(Array.from({length:6},(_,i)=>result.filter(r=>r.group===i).length),[20,20,20,20,20,20]);
});
