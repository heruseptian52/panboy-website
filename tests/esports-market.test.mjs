import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {DatabaseSync} from "node:sqlite";
const require=createRequire(import.meta.url),ts=require("typescript");
function load(path,mocks={},extra={}){const exports={},code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;runInNewContext(code,{exports,require:id=>{if(!(id in mocks))throw Error(id);return mocks[id]},Request,Response,URL,URLSearchParams,crypto,Date,TextEncoder,Uint8Array,File,FormData,console,...extra});return exports}
const model=load("../lib/market-model.ts"),check=load("../lib/roster-check-model.ts");
class D1{db=new DatabaseSync(":memory:");prepare(sql){const db=this.db;let args=[];return{bind(...a){args=a;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}}}}}
const env={DB:new D1(),BUCKET:{head:async()=>null}},hashRosterToken=async v=>Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))).toString("hex");
const store=load("../lib/esports-market.ts",{"cloudflare:workers":{env},"./market-model":model,"./blacklist":{verifyMember:async(team,phone)=>team==="Team"&&phone==="0812345678"?{id:5}:null},"./event-rosters":{hashRosterToken}});
const auth={requirePermission:async(r,p)=>r.headers.get("admin")==="yes"&&p==="market"?{market:true,blacklist:false}:null};
const pub=load("../app/api/esports-market/route.ts",{"../../../lib/esports-market":store});
const admin=load("../app/api/admin/esports-market/route.ts",{"cloudflare:workers":{env},"../../../../lib/admin-auth":auth,"../../../../lib/esports-market":store,"../../../../lib/market-model":model,"../../../../lib/event-rosters":{hashRosterToken}});
const post=(route,body,allowed=false)=>route.POST(new Request("https://example.test/api",{method:"POST",headers:{"Content-Type":"application/json",...(allowed?{admin:"yes"}:{})},body:JSON.stringify(route===pub?{consent:true,...body}:body)}));
test("market moderation and private edit isolate token and preserves last approved revision",async()=>{
 const initial=await post(pub,{kind:"player",data:{name:"PRO PLAYER",role:"IGL",unknown:"SECRET"}});assert.equal(initial.status,200,await initial.clone().text());const {id,token}=await initial.json();
 assert.equal((await store.publicMarket(await store.settings())).length,0);
 assert.equal((await post(admin,{action:"approve",id})).status,403);
 assert.equal((await post(admin,{action:"approve",id},true)).status,200);
 let current=await store.publicMarket(await store.settings());assert.equal(current[0].data.name,"PRO PLAYER");assert.equal(current[0].data.unknown,undefined);
 assert.equal((await post(pub,{kind:"player",data:{name:"INTRUDER"},token:"bad"})).status,400);
 assert.equal((await post(pub,{kind:"player",data:{name:"EDITED"},token})).status,200);current=await store.publicMarket(await store.settings());assert.equal(current[0].data.name,"PRO PLAYER");
 const edit=await pub.GET(new Request("https://example.test/api?token="+token));assert.equal((await edit.json()).item.data.name,"EDITED");
 assert.equal((await post(admin,{action:"reject",id,reason:"Koreksi"},true)).status,200);
 assert.equal((await store.publicMarket(await store.settings()))[0].data.name,"PRO PLAYER");
 assert.equal((await post(admin,{action:"delete",id},true)).status,200);assert.equal((await store.publicMarket(await store.settings())).length,0);
 assert.equal((await post(pub,{kind:"player",token,data:{name:"REVIVE"}})).status,400);
});
test("required minimum, optional fields, URL safety, member restriction and role settings",async()=>{
 assert.throws(()=>model.validateData("team",{name:"x"},model.marketDefaults));assert.throws(()=>model.validateData("player",{name:"ok",playerId:"abc"},model.marketDefaults));assert.throws(()=>model.validateData("team",{name:"ok",Instagram:"javascript:alert(1)"},model.marketDefaults));
 assert.equal((await post(admin,{action:"settings",settings:{...model.marketDefaults,membersOnly:true}},true)).status,200);
 assert.equal((await post(pub,{kind:"team",data:{name:"Team A"}})).status,400);
 const valid=await post(pub,{kind:"team",data:{name:"Team A",position:"Coach",WhatsApp:"081234567890"},memberTeam:"Team",memberPhone:"0812345678"});assert.equal(valid.status,200,await valid.clone().text());
});
test("roster checker finds intra team and cross team duplicate and approved exact ID blacklisted",()=>{
 const issues=check.checkRoster([{id:1,teamName:"Alpha",players:[{nick:"a",playerId:"12345"},{nick:"b",playerId:"12345"}]},{id:2,teamName:"Beta",players:[{nick:"c",playerId:"12345"},{nick:"a",playerId:"67890"}]}],[{id:8,playerId:"12345",reason:"Test"}]);
 assert.equal(issues.length,2);assert.equal(issues.find(i=>i.type==="duplicate").players.length,3);assert.equal(issues.find(i=>i.type==="blacklist").blacklist.id,8);
});
test("chunked client handles small image, preserves query and emits total progress",async()=>{
 const calls=[],events=[];const f=load("../lib/upload-form.ts",{}, {location:{origin:"https://example.test"},window:{dispatchEvent:e=>events.push(e.detail)},CustomEvent,AbortController,DOMException,setTimeout,Blob,fetch:async(url,opts)=>{calls.push([url,opts]);const action=new URL(url).searchParams.get("action");return Response.json(action==="init"?{uploadId:"test",chunkSize:512}:action==="complete"?{url:"/image.png"}:{ok:true})}});
 const body=new FormData();body.append("poster",new File([new Uint8Array(40)],"logo.png",{type:"image/png"}));const r=await f.uploadForm("/api/esports-market/upload?kind=image",{method:"POST",body});
 assert.equal(r.status,200);assert.equal(calls.length,3);assert.ok(calls.every(([u])=>new URL(u).searchParams.get("kind")==="image"));assert.deepEqual(events.map(x=>x.percent),[0,99,100]);
});
test("market image and video chunk persistence, private draft and approved media access",async()=>{
 const objects=new Map(),bucket={async put(k,v,opts){objects.set(k,{v,opts})},async get(k){const x=objects.get(k);return x?{json:async()=>JSON.parse(x.v),arrayBuffer:async()=>x.v instanceof ArrayBuffer?x.v:x.v.buffer.slice(x.v.byteOffset,x.v.byteOffset+x.v.byteLength)}:null},async head(k){return objects.get(k)||null},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k)}};
 env.BUCKET=bucket;
 const images=load("../lib/uploaded-image.ts"),chunk=load("../lib/chunked-image.ts",{"cloudflare:workers":{env},"./uploaded-image":images});
 const route=load("../app/api/esports-market/upload/route.ts",{"cloudflare:workers":{env},"../../../../lib/chunked-image":chunk,"../../../../lib/esports-market":store});
 const send=(kind,action,body)=>route.POST(new Request("https://example.test/api?kind="+kind+"&action="+action,{method:"POST",body}));
 const upload=async(kind,bytes,name)=>{const init=await (await send(kind,"init",JSON.stringify({size:bytes.length,name}))).json();assert.ok(init.uploadId);const suffix="&uploadId="+init.uploadId;assert.equal((await send(kind,"chunk"+suffix+"&index=0",bytes)).status,200);const done=await send(kind,"complete"+suffix);assert.equal(done.status,200,await done.clone().text());return (await done.json()).url};
 const img=new Uint8Array(40);img.set([137,80,78,71,13,10,26,10]);const video=new Uint8Array(40);video.set([0,0,0,20,102,116,121,112]);const photo=await upload("image",img,"logo.png"),clip=await upload("video",video,"clip.mp4");
 assert.equal(objects.get(model.mediaKey(photo)).v.length,40);assert.equal(objects.get(model.mediaKey(clip)).v.length,40);
 await post(admin,{action:"settings",settings:model.marketDefaults},true);
 const result=await (await post(pub,{kind:"player",data:{name:"Media player",photo,video:clip}})).json();
 assert.ok(result.id);assert.equal(await store.isMarketMediaPublic(model.mediaKey(photo)),false);
 assert.equal(await store.isMarketMediaPrivate(model.mediaKey(photo),result.token),true);
 assert.equal(await store.isMarketMediaPrivate(model.mediaKey(photo),"wrong"),false);
 assert.equal((await post(admin,{action:"approve",id:result.id},true)).status,200);
 assert.equal(await store.isMarketMediaPublic(model.mediaKey(photo)),true);
 assert.equal(await store.isMarketMediaPublic(model.mediaKey(clip)),true);
});
