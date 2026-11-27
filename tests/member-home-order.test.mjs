import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import test from "node:test";
import ts from "typescript";
function load(path,mocks={}){const exports={},source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;runInNewContext(source,{exports,require:name=>mocks[name],Request,Response,Date});return exports}
const order=load("../lib/member-home-order.ts");
const fixture=Array.from({length:12},(_,i)=>({id:i+1,teamName:"TEAM "+(i+1),sortOrder:i,active:i!==4,logoUrl:"",membershipEnd:""}));
const ids=rows=>Array.from(rows,x=>x.id);
test("previous featured member retained until saved; new order supports every team",()=>{
 assert.deepEqual(ids(order.orderHomeMembers(fixture,"","8")),[8,1,2,3,4,5,6,7,9,10,11,12]);
 const selected=[12,8,6,4,1,2,3,5,7,9,10,11];
 assert.deepEqual(ids(order.orderHomeMembers(fixture,JSON.stringify(selected),"2")),selected);
 assert.deepEqual(ids(order.orderHomeMembers(fixture.filter(m=>m.active),JSON.stringify(selected),"2")),selected.filter(x=>x!==5));
 assert.deepEqual(ids(order.orderHomeMembers(fixture,"[]","8")),ids(fixture));
 const added={id:13,sortOrder:0,teamName:"NEW"};
 assert.equal(order.orderHomeMembers([...fixture,added],JSON.stringify(selected),"")[12].id,13);
});
test("move front, down and direct position; bad IDs or duplicate configuration rejected",()=>{
 assert.equal(order.moveMember(fixture,12,0)[0].id,12);
 assert.equal(order.moveMember(fixture,1,8)[8].id,1);
 assert.equal(order.moveMember(fixture,2,2)[2].id,2);
 assert.equal(order.parseMemberOrder("[2,2]"),null);
 assert.equal(order.parseMemberOrder("[2,-2]"),null);
});
test("admin order endpoint persists independently, validates known IDs and authority",async()=>{
 let stored="",writes=0;
 const route=load("../app/api/admin/member-order/route.ts",{
  "cloudflare:workers":{env:{DB:{prepare:()=>({bind(value){stored=value;return this},async run(){writes++}})}}},
  "../../../../lib/admin-auth":{requirePermission:async(r,p)=>p==="appearance"&&r.headers.get("cookie")==="admin"},
  "../../../../lib/settings":{getSettings:async()=>({featuredMemberOrder:stored,featuredMemberId:"8"}),ensureSettings:async()=>{}},
  "../../../../lib/members":{getCommunityMembers:async()=>fixture},
  "../../../../lib/member-home-order":order,
 });
 const get=auth=>route.GET(new Request("https://example.test",{headers:auth?{cookie:"admin"}:{}}));
 const put=(ids,auth=true)=>route.PUT(new Request("https://example.test",{method:"PUT",headers:auth?{cookie:"admin"}:{},body:JSON.stringify({ids})}));
 assert.equal((await get(false)).status,403);assert.equal((await put([1],false)).status,403);
 assert.equal((await put([1,1])).status,400);assert.equal((await put([999])).status,409);
 assert.equal(writes,0);
 const selected=[12,1,5,2,3,4,6,7,8,9,10,11];
 assert.equal((await put(selected)).status,200);assert.equal(writes,1);
 const data=await (await get(true)).json();assert.deepEqual(data.members.map(m=>m.id),selected);assert.equal(data.members[2].active,false);
});
test("both homepage sliders use shared order; public contact changed while admin login remains",()=>{
 const homepage=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(homepage,/members=\{memberShowcase\.map/);assert.match(homepage,/refresh-member-grid">\{memberShowcase\.map/);
 assert.doesNotMatch(homepage,/Member komunitas ·/);assert.match(homepage,/mailto:panboycommunity@gmail\.com/);
 assert.match(readFileSync(new URL("../lib/admin-auth.ts",import.meta.url),"utf8"),/OWNER_EMAIL = "heruseptian52@gmail\.com"/);
 assert.match(readFileSync(new URL("../app/api/admin/settings/route.ts",import.meta.url),"utf8"),/key !== "featuredMemberOrder"/);
});
