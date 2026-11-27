import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,mocks){const exports={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;runInNewContext(code,{exports,require:id=>{if(!(id in mocks))throw Error(`Unexpected import ${id}`);return mocks[id]},Request,Response,Date,JSON,Number,String,URL,console});return exports}
class D1{db=new DatabaseSync(':memory:');prepare(sql){let args=[];const db=this.db;return {bind(...v){args=v;return this},async run(){const x=db.prepare(sql).run(...args);return{meta:{last_row_id:Number(x.lastInsertRowid),changes:x.changes}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}}}}async batch(stmts){return Promise.all(stmts.map(s=>s.run()))}}
const db=new D1(),events=load('../lib/events.ts',{'cloudflare:workers':{env:{DB:db}}});
const route=load('../app/api/admin/events/route.ts',{'cloudflare:workers':{env:{DB:db}},'../../../../lib/events':events,'../../../../lib/admin-auth':{requirePermission:async()=>({email:'test@example.invalid'})},'../../../../lib/audit':{audit:async()=>{}}});
test('event internal tersimpan dan dapat diubah kembali menjadi publik',async()=>{
 await events.ensureEventsTable();
 const payload={title:'EVENT INTERNAL UJI',startDate:'2027-01-20',endDate:'2027-01-21',prizepool:'Rp1.000.000',registrationFee:'Gratis',imageUrl:'/poster.jpg',category:'Community Event',status:'FREE REGISTRATION',whatsapp:'081545910291',eventMode:'Online',registrationType:'INTERNAL'};
 const post=await route.POST(new Request('http://localhost/api/admin/events',{method:'POST',body:JSON.stringify(payload)}));assert.equal(post.status,200);const {id}=await post.json();
 let row=db.db.prepare('SELECT registration_type FROM events WHERE id=?').get(id);assert.equal(row.registration_type,'INTERNAL');
 const put=await route.PUT(new Request('http://localhost/api/admin/events',{method:'PUT',body:JSON.stringify({...payload,id,registrationType:'PUBLIC'})}));assert.equal(put.status,200);
 row=db.db.prepare('SELECT registration_type FROM events WHERE id=?').get(id);assert.equal(row.registration_type,'PUBLIC');
});
