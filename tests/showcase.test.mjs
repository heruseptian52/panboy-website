import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";
import ts from "typescript";
function load(path,mocks={}){
 const exports={},code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(code,{exports,require:name=>{if(!(name in mocks))throw Error("Unexpected import "+name);return mocks[name]},Request,Response,Headers,URL,URLSearchParams,crypto,Date,console,File,FormData,Uint8Array});
 return exports;
}
class D1{
 db=new DatabaseSync(":memory:");
 prepare(sql){const db=this.db;let args=[];return{bind(...values){args=values;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}}}}
 async batch(statements){return Promise.all(statements.map(x=>x.run()))}
}
const model=load("../lib/showcase-model.ts"),db=new D1(),env={DB:db};
db.db.exec("CREATE TABLE community_members(id INTEGER PRIMARY KEY,active INTEGER,membership_end TEXT);INSERT INTO community_members VALUES(1,1,'2099-01-01'),(2,1,'2025-01-01');");
const store=load("../lib/showcase.ts",{"cloudflare:workers":{env},"./showcase-model":model});
const auth={requirePermission:async(r,p)=>p==="appearance"&&r.headers.get("cookie")==="admin"};
const admin=load("../app/api/admin/showcase/route.ts",{"cloudflare:workers":{env},"../../../../lib/admin-auth":auth,"../../../../lib/members":{getCommunityMembers:async()=>[{id:1,teamName:"A",logoUrl:"",active:true,membershipEnd:"2099-01-01"}]},"../../../../lib/showcase":store,"../../../../lib/showcase-model":model});
const track=load("../app/api/showcase/track/route.ts",{"cloudflare:workers":{env},"../../../../lib/showcase":store,"../../../../lib/showcase-model":model});
const request=(data,authorized=true)=>new Request("https://example.test/api/admin/showcase",{method:"POST",headers:authorized?{cookie:"admin"}:{},body:JSON.stringify(data)});
const save=async(ad)=>admin.POST(request({action:"save",ad}));
const content={consentConfirmed:true};
const future="2099-01-01T00:00:00.000Z",past="2020-01-01T00:00:00.000Z";
const poster="/api/images/showcase-media%2Ftest.png";
test("safe migration is additive; empty public homepage and permissions",async()=>{
 assert.equal((await store.getPublicShowcases()).ads.length,0);
 assert.equal((await admin.POST(request({action:"save",ad:{id:"evil",content:{title:"x"}}},false))).status,403);
 assert.equal((await admin.GET(new Request("https://example.test/api/admin/showcase"))).status,403);
 db.db.exec(readFileSync(new URL("../sql/showcase_2026_11_25.sql",import.meta.url),"utf8"));
 const result=await admin.GET(new Request("https://example.test/api/admin/showcase",{headers:{cookie:"admin"}}));assert.equal(result.status,200);
 assert.equal((await result.json()).members[0].name,"A");
 assert.equal(db.db.prepare("SELECT count(*) AS n FROM community_members").get().n,2);
});
test("poster-, video-, link- and biodata-only ads, priority, dates and visible fields",async()=>{
 for(const ad of [
  {id:"poster",status:"published",priority:4,content:{...content,media:[{id:"m",kind:"image",url:poster}]}},
  {id:"video",status:"published",priority:3,content:{...content,media:[{id:"v",kind:"video",url:"/api/images/showcase-media%2Ftest.mp4"}]}},
  {id:"link",status:"published",priority:2,content:{...content,links:[{id:"l",platform:"Instagram",url:"https://instagram.com/team"},{id:"hidden",url:"https://example.test/private",visible:false}],detail:true}},
  {id:"bio",status:"published",memberId:1,content:{...content,label:"Official Member",bios:[{id:"b",title:"Founder"},{id:"secret",title:"Hidden person",visible:false}],about:"Hidden about",hiddenProfile:["about"]}},
  {id:"expired",status:"published",endsAt:past,content:{...content,title:"expired"}},
  {id:"scheduled",status:"published",startsAt:future,content:{...content,title:"scheduled"}},
  {id:"draft",status:"draft",content:{title:"draft",media:[{id:"d",url:"/api/images/showcase-media%2Fdraft.png"}]}},
  {id:"inactive",status:"inactive",content:{title:"inactive"}},
  {id:"expiredmember",status:"published",memberId:2,content:{...content,title:"a",label:"Official Member"}},
 ]){const r=await save(ad);assert.equal(r.status,200,await r.clone().text())}
 const {ads}=await store.getPublicShowcases();
 assert.deepEqual(Array.from(ads,x=>x.id),["poster","video","link","bio","expiredmember"]);
 const bio=ads.find(a=>a.id==="bio");assert.equal(bio.label,"Official Member");assert.equal(bio.content.about,"");assert.equal(bio.content.bios.length,1);
 assert.equal(ads.find(a=>a.id==="expiredmember").label,"");
 assert.equal(ads.find(a=>a.id==="link").content.links.length,1);
 assert.equal(await store.isShowcaseMediaPublic("showcase-media/test.png"),true);
 assert.equal(await store.isShowcaseMediaPublic("showcase-media/draft.png"),false);
 assert.equal((await store.getPublicShowcases("expired")).ads.length,0);
});
test("reject unsafe URLs, invalid dates, consent missing, empty ads and wrong media type",async()=>{
 for(const ad of [
  {status:"published",content:{...content}},
  {status:"published",content:{title:"Missing consent"}},
  {status:"published",startsAt:future,endsAt:past,content:{...content,title:"bad dates"}},
  {status:"published",content:{...content,links:[{url:"javascript:alert(1)"}]}},
  {status:"published",content:{...content,logo:"/api/images/member-payment-proofs%2Fprivate.png"}},
  {status:"published",content:{...content,media:[{kind:"video",url:poster}]}},
 ])assert.equal((await save(ad)).status,400);
});
test("tracking only visible active entities; config custom categories and WhatsApp",async()=>{
 const t=(id,key)=>track.POST(new Request("https://example.test/api/showcase/track",{method:"POST",headers:{origin:"https://example.test"},body:JSON.stringify({id,key})}));
 assert.equal((await t("poster","view")).status,204);assert.equal((await t("poster","view")).status,204);
 assert.equal((await t("link","link:l")).status,204);assert.equal((await t("link","detail")).status,204);
 assert.equal((await t("link","link:hidden")).status,404);assert.equal((await t("link","link:l:extra")).status,404);assert.equal((await t("expired","view")).status,404);
 assert.equal(db.db.prepare("SELECT total FROM showcase_stats WHERE ad_id='poster' AND metric='view'").get().total,2);
 const config={whatsapp:"628123456789",categories:[{id:"custom",name:"Sponsor baru"}]};
 assert.equal((await admin.POST(request({action:"config",config}))).status,200);
 assert.equal((await store.getPublicShowcases()).whatsapp,config.whatsapp);
 const r=await save({id:"custom",status:"published",content:{...content,title:"New",categoryId:"custom",showCategory:true,label:"Sponsor",partnershipConfirmed:false}});
 assert.equal(r.status,200);const [ad]=(await store.getPublicShowcases("custom")).ads;assert.equal(ad.category,"Sponsor baru");assert.equal(ad.label,"");
});
test("private Showcase file respects active ad, draft admin access, range and no-store",async()=>{
 const bucket={get:async()=>({body:"image",size:5,httpMetadata:{contentType:"image/png"},etag:"a"}),head:async()=>({size:5,httpMetadata:{contentType:"image/png"},etag:"a"})};
 const image=load("../app/api/images/[...key]/route.ts",{"cloudflare:workers":{env:{BUCKET:bucket}},"../../../../lib/admin-auth":auth,"../../../../lib/showcase":store,"../../../../lib/esports-market":{isMarketMediaPublic:async()=>false}});
 const get=(key,headers={})=>image.GET(new Request("https://example.test/media",{headers}),{params:Promise.resolve({key:key.split("/")})});
 assert.equal((await get("showcase-media/draft.png")).status,404);
 assert.equal((await get("showcase-media/draft.png",{cookie:"admin"})).status,200);
 const live=await get("showcase-media/test.png",{range:"bytes=0-2"});assert.equal(live.status,206);assert.equal(live.headers.get("Cache-Control"),"private, no-store");
 assert.equal((await get("temp-showcase-video/upload/part-0")).status,404);
 assert.equal((await get("image-upload-temp/showcase-media/secret/part-0")).status,404);
});
test("reserved custom label still follows current membership; raw protected media path is rejected",()=>{
 const ad=model.normalizeAd({id:"test",content:{title:"Team",label:"Custom Label",customLabel:"official member"}});
 assert.equal(model.publicContent(ad,model.defaultConfig,false).label,"");
 assert.equal(model.publicContent(ad,model.defaultConfig,true).label,"Official Member");
 assert.throws(()=>model.mediaUrl("/api/images/member-payment-proofs/private.png"));
 assert.equal(model.mediaUrl("/api/images/showcase-media/test.png"),poster);
});
test("public markup has no empty section, preserves poster and real brand link, and hides private profile",async()=>{
 const React=await import("react"),jsx=await import("react/jsx-runtime"),{renderToStaticMarkup}=await import("react-dom/server");
 const code=ts.transpileModule(readFileSync(new URL("../app/showcase/showcase-view.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,component={};
 runInNewContext(code,{exports:component,require:name=>name==="react"?React:name==="react/jsx-runtime"?jsx:name==="./showcase.css"?{}:(()=>{throw Error("Unexpected import "+name)})(),URL,fetch,console});
 const empty=renderToStaticMarkup(React.createElement(component.ShowcaseSection,{ads:[],whatsapp:"628123456789"}));
 assert.equal(empty,"");
 const ad=model.normalizeAd({id:"markup",content:{media:[{id:"m",url:poster}],links:[{id:"l",platform:"Tokopedia",url:"https://tokopedia.com/team"}],bios:[{id:"b",title:"HIDDEN PRIVATE",visible:false}],detail:true}});
 const clean=model.publicContent(ad,model.defaultConfig,false);
 const html=renderToStaticMarkup(React.createElement(component.ShowcaseSection,{ads:[clean],whatsapp:"628123456789"}));
 assert.match(html,/PANBOY.*SHOWCASE/);assert.match(html,/showcase-brands\/tokopedia.svg/);assert.match(html,/noopener noreferrer/);assert.match(html,/LIHAT DETAIL/);assert.doesNotMatch(html,/HIDDEN PRIVATE/);
});
