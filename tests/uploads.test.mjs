import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,mocks){const exports={},source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;runInNewContext(source,{exports,require:id=>{if(!(id in mocks))throw Error(`Unexpected import ${id}`);return mocks[id]},Request,Response,File,FormData,URL,Uint8Array,ArrayBuffer,Date,crypto,Math,Number,String,JSON,TextDecoder,console});return exports}
const data=new Map(),multipart=new Map();let mpCounter=0;
const bucket={async put(key,value){data.set(key,value)},async get(key){const value=data.get(key);return value===undefined?null:{async json(){return JSON.parse(value)},async arrayBuffer(){return value instanceof ArrayBuffer?value:value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)}}},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])data.delete(key)},async createMultipartUpload(key){const parts=[],uploadId=String(++mpCounter);const handle={uploadId,async uploadPart(n,bytes){parts[n-1]=bytes;return{partNumber:n,etag:`part-${n}`}},async complete(){data.set(key,parts)},async abort(){multipart.delete(uploadId)}};multipart.set(uploadId,handle);return handle},resumeMultipartUpload(_key,id){return multipart.get(id)}};
const mocks={'cloudflare:workers':{env:{BUCKET:bucket}},'./uploaded-image':{detectUploadedImage:bytes=>bytes[0]===137&&bytes[1]===80?{extension:'png',contentType:'image/png'}:null}};
const image=load('../lib/chunked-image.ts',mocks);
const admin=load('../app/api/admin/upload/route.ts',{'cloudflare:workers':{env:{BUCKET:bucket}},'../../../../lib/admin-auth':{requestAdmin:async()=>({partners:true})},'../../../../lib/uploaded-image':mocks['./uploaded-image'],'../../../../lib/chunked-image':image});
const video=load('../app/api/admin/upload-video/route.ts',{'cloudflare:workers':{env:{BUCKET:bucket}},'../../../../lib/admin-auth':{requestAdmin:async()=>({appearance:true})}});
async function post(route,url,body,headers={}){return route.POST(new Request(`http://local${url}`,{method:'POST',body,headers}))}
test('partner image above edge limit is reconstructed and validated',async()=>{
 const bytes=new Uint8Array(3*1024*1024+12);bytes[0]=137;bytes[1]=80;
 const init=await (await post(admin,'/api/admin/upload?action=init',JSON.stringify({size:bytes.length}),{'Content-Type':'application/json'})).json();
 assert.equal(init.chunkSize,512*1024);
 for(let index=0;index<Math.ceil(bytes.length/init.chunkSize);index++)assert.equal((await post(admin,`/api/admin/upload?action=chunk&uploadId=${init.uploadId}&index=${index}`,bytes.slice(index*init.chunkSize,(index+1)*init.chunkSize))).status,200);
 const result=await (await post(admin,`/api/admin/upload?action=complete&uploadId=${init.uploadId}`)).json();
 assert.match(result.url,/^\/api\/images\/uploads%2F/);
 assert.equal(data.get(decodeURIComponent(result.url.slice('/api/images/'.length))).length,bytes.length);
});
test('invalid image content is rejected even after all chunks',async()=>{
 const bytes=new Uint8Array(600000),init=await (await post(admin,'/api/admin/upload?action=init',JSON.stringify({size:bytes.length}),{'Content-Type':'application/json'})).json();
 for(let i=0;i<2;i++)await post(admin,`/api/admin/upload?action=chunk&uploadId=${init.uploadId}&index=${i}`,bytes.slice(i*init.chunkSize,(i+1)*init.chunkSize));
 assert.equal((await post(admin,`/api/admin/upload?action=complete&uploadId=${init.uploadId}`)).status,400);
});
test('video larger than edge limit uses small requests and multipart assembly',async()=>{
 const size=14*1024*1024+5,parts=Math.ceil(size/1048576);
 const init=await (await post(video,'/api/admin/upload-video?action=init',JSON.stringify({name:'test.mp4',size,parts}),{'Content-Type':'application/json'})).json();
 for(let i=0;i<parts;i++){const chunk=new Uint8Array(Math.min(1048576,size-i*1048576));if(i===0)chunk.set([0,0,0,20,102,116,121,112]);assert.equal((await post(video,`/api/admin/upload-video?action=chunk&uploadId=${init.uploadId}&index=${i}`,chunk)).status,200)}
 const response=await post(video,`/api/admin/upload-video?action=complete&uploadId=${init.uploadId}`,JSON.stringify({parts:[]}),{'Content-Type':'application/json'});
 assert.equal(response.status,200,await response.clone().text());
 const key=decodeURIComponent((await response.json()).url.slice('/api/images/'.length));
 assert.deepEqual(data.get(key).map(x=>x.byteLength),[6*1048576,6*1048576,2*1048576+5]);
});
test('showcase video validates signature and uses protected media prefix',async()=>{
 const bytes=new Uint8Array(20);bytes.set([0,0,0,20,102,116,121,112],0);
 const endpoint='/api/admin/upload-video?showcase=1&action=';
 const begin=await post(video,endpoint+'init',JSON.stringify({name:'test.mp4',size:bytes.length,parts:1}),{'Content-Type':'application/json'});
 assert.equal(begin.status,200);const {uploadId}=await begin.json();
 assert.equal((await post(video,endpoint+'chunk&uploadId='+uploadId+'&index=0',new Uint8Array(20))).status,400);
 assert.equal((await post(video,endpoint+'chunk&uploadId='+uploadId+'&index=0',bytes)).status,200);
 const complete=await post(video,endpoint+'complete&uploadId='+uploadId);
 assert.equal(complete.status,200);assert.match((await complete.json()).url,/^\/api\/images\/showcase-media%2F/);
});
test('showcase image chunk upload requires appearance and validates content into protected prefix',async()=>{
 const route=load('../app/api/admin/showcase/upload/route.ts',{'cloudflare:workers':{env:{BUCKET:bucket}},'../../../../../lib/admin-auth':{requirePermission:async(r,p)=>p==='appearance'&&r.headers.get('x-admin')==='yes'},'../../../../../lib/uploaded-image':mocks['./uploaded-image'],'../../../../../lib/chunked-image':image});
 const base='/api/admin/showcase/upload?action=',bytes=new Uint8Array(600000);bytes[0]=137;bytes[1]=80;
 const body=JSON.stringify({size:bytes.length});
 assert.equal((await post(route,base+'init',body,{'Content-Type':'application/json'})).status,403);
 const headers={'x-admin':'yes'},init=await (await post(route,base+'init',body,{...headers,'Content-Type':'application/json'})).json();
 for(let i=0;i<2;i++)assert.equal((await post(route,base+'chunk&uploadId='+init.uploadId+'&index='+i,bytes.slice(i*init.chunkSize,(i+1)*init.chunkSize),headers)).status,200);
 const saved=await post(route,base+'complete&uploadId='+init.uploadId,null,headers);assert.equal(saved.status,200);assert.match((await saved.json()).url,/^\/api\/images\/showcase-media%2F/);
});

test("music upload validates, saves correct type and supports completion retry",async()=>{
 const route=load("../app/api/admin/upload-audio/route.ts",{"cloudflare:workers":{env:{BUCKET:bucket}},"../../../../lib/admin-auth":{requestAdmin:async()=>({appearance:true})}});
 const base="/api/admin/upload-audio?action=",size=32;
 const init=await (await post(route,base+"init",JSON.stringify({name:"song.mp3",parts:1,size}),{"Content-Type":"application/json"})).json();
 const bytes=new Uint8Array(size);bytes.set([73,68,51]);
 assert.equal((await post(route,base+"chunk&uploadId="+init.uploadId+"&index=0",new Uint8Array(size))).status,400);
 assert.equal((await post(route,base+"chunk&uploadId="+init.uploadId+"&index=0",bytes)).status,200);
 const saved=await (await post(route,base+"complete&uploadId="+init.uploadId)).json(),again=await (await post(route,base+"complete&uploadId="+init.uploadId)).json();
 assert.equal(saved.url,again.url);assert.equal(data.get(decodeURIComponent(saved.url.slice("/api/images/".length))).length,size);
});
