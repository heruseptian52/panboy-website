import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
const code=ts.transpileModule(readFileSync(new URL('../lib/roster-whatsapp.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};runInNewContext(code,{exports,encodeURIComponent,Error});
const form=readFileSync(new URL('../app/data-event/roster-form.tsx',import.meta.url),'utf8');
const success=readFileSync(new URL('../app/data-event/berhasil/success.tsx',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/data-event/berhasil/page.tsx',import.meta.url),'utf8');

test('pesan WhatsApp hanya nama team, termasuk karakter khusus, tanpa token edit',()=>{
  const url=new URL(exports.teamWhatsAppUrl(' VXRAEN & Co '));
  assert.equal(url.hostname,'wa.me');
  assert.equal(url.searchParams.get('text'),'Nama Team: VXRAEN & Co');
  assert.equal(url.searchParams.has('token'),false);
  assert.ok(!url.href.includes('editToken'));
});
test('hanya kirim data baru yang menandai auto WhatsApp setelah respons sukses',()=>{
  assert.match(form,/if\(!response\.ok\)throw new Error\(result\.error\|\|"Gagal menyimpan"\);const params=/);
  assert.match(form,/if\(!editToken\)params\.set\("wa","1"\)/);
  assert.match(success,/new URLSearchParams\(location\.search\)\.get\("wa"\)!=="1"/);
  assert.match(success,/whatsappOpened\.current=true/);
  assert.match(success,/current\.searchParams\.delete\("wa"\)/);
  assert.match(success,/location\.assign\(teamWhatsAppUrl\(saved\.teamName\)\)/);
});
test('link grup dan link edit pribadi tetap tersedia di halaman konfirmasi',()=>{
  assert.match(success,/href=\{saved\.groupUrl\}/);
  assert.match(success,/value=\{editLink\}/);
  assert.doesNotMatch(success,/encodeURIComponent\(editLink\)/);
  assert.match(page,/referrer:"no-referrer"/);
});
