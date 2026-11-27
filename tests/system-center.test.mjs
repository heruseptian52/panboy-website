import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {DatabaseSync} from "node:sqlite";
const source=readFileSync(new URL("../app/api/admin/system-center/route.ts",import.meta.url),"utf8");
function route(admin,env={}) {
  const module={exports:{}};
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function("require","exports",js)(name=>name==="cloudflare:workers"?{env}:{requestAdmin:async()=>admin},module.exports);
  return query=>module.exports.GET(new Request("https://example.test/?"+query));
}
test("guest and non-owner cannot inspect database or storage",async()=>{
  for(const admin of [null,{isOwner:false}]) for(const query of ["","part=storage"])
    assert.equal((await route(admin)(query)).status,403);
});
test("counts real SQLite rows across pages and preserves unavailable quota",async()=>{
 const db=new DatabaseSync(":memory:");
 for(let i=0;i<9;i++) db.exec('CREATE TABLE t'+i+' (id INTEGER); INSERT INTO t'+i+' VALUES (1),(2)');
 const get=route({isOwner:true},{DB:{prepare:sql=>({all:()=>({results:db.prepare(sql).all(),meta:{}}),first:key=>db.prepare(sql).get()[key]})}});
 const first=await (await get("")).json(),last=await (await get("offset=8")).json();
 assert.equal(first.next,8);assert.equal(first.bytes,null);assert.equal(last.next,null);
 assert.deepEqual([...first.rows,...last.rows].map(t=>t.count),Array(9).fill(2));db.close();
});
test("storage reports measured bytes and returns continuation cursor",async()=>{
 const get=route({isOwner:true},{BUCKET:{list:async()=>({objects:[{size:12},{size:23}],truncated:true,cursor:"next"})}});
 assert.deepEqual(await (await get("part=storage")).json(),{count:2,bytes:35,groups:{"File lainnya":{count:2,bytes:35}},next:"next"});
});
