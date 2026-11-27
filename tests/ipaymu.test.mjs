import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {createIPaymuPayment,ipaymuConfig} from '../lib/ipaymu.ts';
const env={IPAYMU_MODE:'live',IPAYMU_VA:'123456789',IPAYMU_API_KEY:'test-only-key'};
const input={referenceId:'TEST-ONLY',amount:10000,productName:'Iuran Uji'};
async function mock(response,fn){const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{fn?.(url,options);return response};try{return await createIPaymuPayment(env,input)}finally{globalThis.fetch=original}}
test('sends exact signed JSON and complete HTTPS callback/return URLs',async()=>{const out=await mock(Response.json({Status:200,Data:{Url:'https://my.ipaymu.com/payment/test',SessionID:'test'}}),(url,o)=>{assert.equal(url,'https://my.ipaymu.com/api/v2/payment');const body=JSON.parse(o.body);assert.equal(body.notifyUrl,'https://panboycommunity.my.id/api/payments/ipaymu');assert.equal(body.returnUrl,'https://panboycommunity.my.id/member');const hash=createHash('sha256').update(o.body).digest('hex');const sig=createHmac('sha256',env.IPAYMU_API_KEY).update(`POST:${env.IPAYMU_VA}:${hash}:${env.IPAYMU_API_KEY}`).digest('hex');assert.equal(o.headers.signature,sig)});assert.equal(out.paymentNo,'test')});
test('rejects HTML response with clear status rather than generic checkout error',async()=>{await assert.rejects(()=>mock(new Response('<html>denied</html>',{status:403,headers:{'content-type':'text/html'}})),/HTTP 403/)});
test('explains provider IP, domain and credentials rejection',async()=>{for(const [message,pattern]of [['Invalid IP',/IP server/],['Invalid Domain',/Daftarkan panboycommunity/],['Unauthorized signature',/kredensial/]])await assert.rejects(()=>mock(Response.json({Status:401,Message:message},{status:401})),pattern)});
test('does not redirect to non-iPaymu hosts',async()=>{await assert.rejects(()=>mock(Response.json({Status:200,Data:{Url:'https://other.example/pay'}})),/Domain halaman/)});
test('supports response lowercase data and trims mode',async()=>{assert.equal(ipaymuConfig({...env,IPAYMU_MODE:' sandbox '}).mode,'sandbox');assert.equal((await mock(Response.json({status:200,data:{url:'https://my.ipaymu.com/payment/test'}}))).redirectUrl,'https://my.ipaymu.com/payment/test')});

test('reports production TLS 526 without disabling certificate verification',async()=>{await assert.rejects(()=>mock(new Response('<html>Invalid SSL certificate</html>',{status:526})),/HTTPS iPaymu gagal diverifikasi.*526/)});
