import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {DatabaseSync} from "node:sqlite";
import test from "node:test";
import ts from "typescript";
function load(path,mocks={}){const exports={},source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;runInNewContext(source,{exports,require:name=>{if(!(name in mocks))throw Error("Unexpected "+name);return mocks[name]},Request,Response,URL,URLSearchParams,Date,crypto,btoa,atob,setTimeout,clearTimeout,console});return exports}
const style=load("../lib/leaderboard-style.ts"),master=load("../lib/master-layout.ts"),render=load("../lib/leaderboard-render.ts",{"./master-layout":master,"./leaderboard-style":style}),live=load("../lib/live-leaderboard.ts",{"./leaderboard-style":style}),short=load("../lib/short-link.ts");
class D1{db=new DatabaseSync(":memory:");prepare(sql){const db=this.db;let args=[];return {bind(...values){args=values;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}}}}async batch(items){return Promise.all(items.map(x=>x.run()))}}
test("eight style shapes keep positions and ranking text; transparent rendering and safe settings",async()=>{
 assert.equal(style.styles.length,8);
 const team=[{id:1,slotNumber:3,name:"TEAM RED",logoUrl:"",matches:2,wwcd:1,kills:5,placementPoints:7,total:12}];
 function canvas(){let texts=[],paths=[];const ctx=new Proxy({fillText:(...a)=>texts.push(a),fillRect:(...a)=>paths.push(["rect",...a]),rect:(...a)=>paths.push(["rect",...a]),roundRect:(...a)=>paths.push(["round",...a]),moveTo:(...a)=>paths.push(["move",...a]),lineTo:(...a)=>paths.push(["line",...a]),measureText:t=>({width:t.length*5}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>(t[k]=v,true)});return {texts,paths,getContext:()=>ctx}}
 const base=canvas(),board={name:"TEST",templateUrl:"",canvasWidth:1080,canvasHeight:1350,layout:{backgroundMode:"transparent",followMaster:true}};
 await render.drawLeaderboard(base,board,team);
 for(const p of style.styles){const target=canvas();await render.drawLeaderboard(target,{...board,layout:{...board.layout,styleId:p.id,design:p.id==="original"?undefined:p.design}},team);assert.deepEqual(target.texts,base.texts);assert.ok(target.paths.length);if(p.id==="capsule")assert.ok(target.paths.some(x=>x[0]==="round"));if(p.id==="futuristic")assert.ok(target.paths.some(x=>x[0]==="line"))}
 const clean=style.sanitizeDesign({opacity:0,borderWidth:99,row:"bad"},"glass");assert.equal(clean.opacity,0);assert.equal(clean.borderWidth,8);assert.equal(clean.row,style.stylePreset("glass").design.row);
 const styled=live.withBoardStyle(live.baseTemplate,{styleId:"split",design:style.stylePreset("split").design});assert.equal(styled.rankX,live.baseTemplate.rankX);assert.equal(styled.styleId,"split");assert.equal(live.withBoardStyle(styled,{styleId:"original"}).styleId,undefined);
});
test("catalog can hide independent roles without removing saved design",()=>{
 const c=structuredClone(style.defaultCatalog);c.entries[0].owner=false;c.entries[1].others=false;
 const checked=style.sanitizeCatalog(c);assert.equal(style.visibleStyles(checked,true).includes("original"),false);assert.equal(style.visibleStyles(checked,false).includes("capsule"),false);assert.equal(style.roleDefault(checked,true),"capsule");assert.equal(style.canChooseStyle(checked,false,"capsule","original"),false);assert.equal(style.canChooseStyle(checked,false,"capsule","capsule"),true);
 assert.throws(()=>style.sanitizeCatalog({...c,entries:c.entries.map(e=>({...e,owner:false}))}));
});
test("short link permits supported internal paths, never arbitrary redirect, and reuses opaque alias",async()=>{
 const db=new D1(),env={DB:db};db.db.exec("CREATE TABLE roster_entries(id INTEGER,event_id INTEGER,edit_token_hash TEXT); INSERT INTO roster_entries VALUES(1,7,'valid-hash'); CREATE TABLE roster_invitations(id INTEGER,roster_event_id INTEGER,token_hash TEXT,revoked INTEGER); CREATE TABLE scoreboards(id INTEGER,overlay_token TEXT);");
 const secret="r.1."+"a".repeat(64),path="/data-event?event=7&token="+secret;
 const api=load("../app/api/short-link/route.ts",{"cloudflare:workers":{env},"../../../lib/short-link":short,"../../../lib/event-rosters":{resolveRosterHash:async(_id,t)=>t===secret?"valid-hash":"not-valid",hashRosterToken:async s=>s}});
 const redirect=load("../app/s/[code]/route.ts",{"cloudflare:workers":{env},"../../../lib/short-link":short});
 const post=path=>api.POST(new Request("https://example.test/api/short-link",{method:"POST",body:JSON.stringify({path})}));
 for(const bad of ["https://example.org","//example.org","/api/admin/setup","/data-event?event=7&token="+secret+"&bad=1","/data-event?event=7&token="+"x".repeat(30)])assert.ok((await post(bad)).status>=400);
 const first=await (await post(path)).json(),second=await (await post(path)).json();assert.match(first.path,/^\/s\/[a-zA-Z0-9_-]{22}$/);assert.equal(first.path,second.path);
 const response=await redirect.GET(new Request("https://example.test"+first.path),{params:Promise.resolve({code:first.path.slice(3)})});assert.equal(response.status,302);assert.equal(response.headers.get("location"),"https://example.test"+path);assert.equal(response.headers.get("referrer-policy"),"no-referrer");
 assert.equal(db.db.prepare("SELECT COUNT(*) n FROM short_links").get().n,1);
});
test("Live polling returns lightweight 204 unchanged, then authoritative result after state changes",async()=>{
 const db=new D1(),env={DB:db};const token="b".repeat(64);
 db.db.exec(`CREATE TABLE scoreboards(id INTEGER PRIMARY KEY,layout_json TEXT,updated_at TEXT,active_match_id INTEGER,point_system_id INTEGER,owner_email TEXT,name TEXT);CREATE TABLE point_systems(id INTEGER,updated_at TEXT);CREATE TABLE live_leaderboard_configs(scoreboard_id INTEGER,overlay_token TEXT,active_template_id TEXT,templates_json TEXT,state_json TEXT,elimination_events_json TEXT,match_epoch INTEGER,updated_at TEXT,display_limit TEXT,side TEXT,show_legend INTEGER);CREATE TABLE scoreboard_matches(id INTEGER,match_number INTEGER,scoreboard_id INTEGER,status TEXT,result_locked INTEGER);CREATE TABLE scoreboard_teams(id INTEGER,scoreboard_id INTEGER,slot_number INTEGER,name TEXT,short_name TEXT,logo_url TEXT);CREATE TABLE scoreboard_results(id INTEGER PRIMARY KEY,team_id INTEGER,match_id INTEGER,placement INTEGER,eliminations INTEGER,placement_points INTEGER,total_points INTEGER,calculation_mode TEXT,manual_points INTEGER,updated_at TEXT);INSERT INTO scoreboards VALUES(1,'{"styleId":"capsule"}','1',11,NULL,'owner','test');INSERT INTO scoreboard_matches VALUES(11,1,1,'active',0);INSERT INTO scoreboard_teams VALUES(1,1,3,'FIRST','F',''),(2,1,4,'SECOND','S','');INSERT INTO scoreboard_results VALUES(1,1,11,0,4,0,4,'auto',NULL,'1'),(2,2,11,0,2,0,2,'auto',NULL,'1');`);
 db.db.prepare("INSERT INTO live_leaderboard_configs VALUES(1,?,'pubg-style','[]','{}','[]',1,'1','all','right',1)").run(token);
 const resultStore=load("../lib/scoreboard-result-store.ts",{"cloudflare:workers":{env}}),match=load("../lib/scoreboard-match.ts"),ranking=load("../lib/live-ranking.ts");
 const rule={id:0,eliminationPoint:1,tieBreak:["wwcd","placementPoints","eliminations"],placement:{"1":10,"2":6}};
 const points={ruleForScoreboard:async()=>rule,score:(r,p,e)=>match.calculateMatchScore(r,p,e)};
 const publicApi=load("../app/api/live-leaderboard/route.ts",{"cloudflare:workers":{env},"../../../lib/live-leaderboard":live,"../../../lib/scoreboard-match":match,"../../../lib/scoreboard-result-store":resultStore,"../../../lib/point-system":points,"../../../lib/live-ranking":ranking});
 const adminApi=load("../app/api/admin/live-leaderboard/route.ts",{"cloudflare:workers":{env},"../../../../lib/admin-auth":{requirePermission:async()=>({email:"owner",isOwner:true})},"../../../../lib/audit":{audit:async()=>{}},"../../../../lib/live-leaderboard":live,"../../../../lib/point-system":points,"../../../../lib/scoreboard-match":match,"../../../../lib/scoreboard-result-store":resultStore,"../../../../lib/leaderboard-catalog":{readTemplateCatalog:async()=>style.defaultCatalog},"../../../../lib/leaderboard-style":style});
 const get=(rev="")=>publicApi.GET(new Request("https://example.test/api/live-leaderboard?"+new URLSearchParams({token,rev})));
 const put=body=>adminApi.PUT(new Request("https://example.test/api/admin/live-leaderboard",{method:"PUT",body:JSON.stringify({id:1,...body})}));
 let data=await (await get()).json();assert.equal(data.rows[0].points,4);assert.equal(data.template.styleId,"capsule");assert.equal((await get(data.revision)).status,204);
 const changed=await put({action:"updateTeamState",teamId:1,players:["alive","knocked","alive","alive"]});assert.equal(changed.status,200,await changed.clone().text());
 let newer=await (await get(data.revision)).json();assert.equal(newer.rows[0].players[1],"knocked");
 const configuration=await put({action:"updateConfig",templates:[live.baseTemplate],activeTemplateId:"pubg-style",state:{},displayLimit:"all"});assert.equal(configuration.status,200);assert.equal(JSON.parse(db.db.prepare("SELECT state_json FROM live_leaderboard_configs").get().state_json)[1].players[1],"knocked");
 assert.equal((await put({action:"adjustScore",teamId:99,field:"elims",delta:1})).status,404);
 const score=await put({action:"adjustScore",teamId:1,field:"elims",delta:1});assert.equal(score.status,200,await score.clone().text());assert.equal((await score.json()).team.elims,5);
 const wipe=await put({action:"updateTeamState",teamId:2,players:["eliminated","eliminated","eliminated","eliminated"]});assert.equal(wipe.status,200,await wipe.clone().text());const results=await wipe.json();assert.equal(results.teamResult.placement,2);assert.equal(results.winnerResult.placement,1);
 data=await (await get()).json();assert.equal(data.allRows.find(x=>x.id===1).points,15);assert.equal(data.allRows.find(x=>x.id===2).points,8);
});
test("management of template visibility is restricted to owner; other admin gets filtered choices",async()=>{
 const db=new D1(),env={DB:db};db.db.exec("CREATE TABLE site_settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT)");
 const catalog=load("../lib/leaderboard-catalog.ts",{"cloudflare:workers":{env},"./leaderboard-style":style});
 const route=load("../app/api/admin/leaderboard-templates/route.ts",{"cloudflare:workers":{env},"../../../../lib/admin-auth":{requestAdmin:async r=>r.headers.get("cookie")==="owner"?{isOwner:true}:r.headers.get("cookie")==="other"?{isOwner:false,leaderboardDesign:true}:null},"../../../../lib/settings":{ensureSettings:async()=>{}},"../../../../lib/leaderboard-catalog":catalog,"../../../../lib/leaderboard-style":style});
 const c=structuredClone(style.defaultCatalog);c.entries[0].owner=false;c.entries[1].others=false;
 const put=role=>route.PUT(new Request("https://example.test",{method:"PUT",headers:{cookie:role},body:JSON.stringify(c)}));
 assert.equal((await put("other")).status,403);assert.equal((await put("owner")).status,200);
 const other=await (await route.GET(new Request("https://example.test",{headers:{cookie:"other"}}))).json();assert.equal(other.catalog,undefined);assert.equal(other.visible.includes("capsule"),false);
 const owner=await (await route.GET(new Request("https://example.test",{headers:{cookie:"owner"}}))).json();assert.equal(owner.catalog.entries.length,8);assert.equal(owner.visible.includes("original"),false);
});
