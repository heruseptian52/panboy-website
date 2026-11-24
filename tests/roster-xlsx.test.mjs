import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTs(file, mocks){
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  runInNewContext(js, {exports,require(name){if(!(name in mocks))throw Error(`Unexpected import ${name}`);return mocks[name]},Blob,URL,Uint8Array,TextEncoder,Date,Number,String,Array,Math,JSON,Map});
  return exports;
}

function generate(teams,settings,maxPlayers=4){
  let files;
  const fflate={strToU8:v=>new TextEncoder().encode(v),zipSync:entries=>{files=entries;return new Uint8Array([0])}};
  const {createRosterWorkbook,rosterExcelColumns}=loadTs('../lib/roster-xlsx.ts',{fflate});
  createRosterWorkbook('VALE ESPORTS DOMINATION SERIES',maxPlayers,teams,settings,"https://panboy.example");
  const decoder = new TextDecoder();
  return {files,columns:rosterExcelColumns(maxPlayers,teams,settings,"https://panboy.example").map(c=>c.heading),
    sheet:decoder.decode(files['xl/worksheets/sheet1.xml']),workbook:decoder.decode(files['xl/workbook.xml'])};
}
const config={playersEnabled:true,excelNicknameEnabled:true,excelPlayerIdEnabled:true,logoEnabled:false,phoneEnabled:false,zonesEnabled:false,maps:['Erangel','Miramar','Rondo']};
const teams=Array.from({length:80},(_,i)=>({teamName:`Team ${i+1}`,players:[{nick:'P1',playerId:'00123456789012345678'}],contactPhone:'081234567890',zones:['Pochinki','Los Leones','Jadena'],logoName:'logo.png',logoUrl:'/api/images/safe.png'}));

test('80 team tetap satu sheet, satu baris per team, satu halaman print A4 landscape',()=>{
  const {files,sheet,workbook}=generate(teams,config);
  assert.deepEqual(Object.keys(files).filter(s=>s.startsWith('xl/worksheets/')),['xl/worksheets/sheet1.xml']);
  assert.equal((sheet.match(/<row r="/g)||[]).length,82);
  assert.match(sheet,/<c r="A3"/);
  assert.match(sheet,/<c r="A82"/);
  assert.match(sheet,/orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="1"/);
  assert.match(workbook,/<sheet name="Data Player"/);
  assert.match(workbook,/\$A\$1:\$I\$82/);
  assert.ok(sheet.includes('00123456789012345678'));
});

test('Kolom Nick dan ID bisa dinonaktifkan terpisah tanpa menghapus roster',()=>{
  const nickOff=generate(teams,{...config,excelNicknameEnabled:false});
  assert.ok(!nickOff.columns.some(v=>v.startsWith('Nick Player')));
  assert.ok(nickOff.columns.some(v=>v.startsWith('ID Player')));
  const idOff=generate(teams,{...config,excelPlayerIdEnabled:false});
  assert.ok(!idOff.columns.some(v=>v.startsWith('ID Player')));
  assert.ok(idOff.columns.some(v=>v.startsWith('Nick Player')));
  const bothOff=generate(teams,{...config,playersEnabled:false});
  assert.equal(bothOff.columns.length,1);
});

test('HP, logo, dan Drop Zone mengikuti pilihan admin; nama tim tetap kolom A',()=>{
  const all=generate(teams,{...config,phoneEnabled:true,logoEnabled:true,zonesEnabled:true});
  assert.deepEqual(Array.from(all.columns.slice(0,7)),['Nama Team','Nomor HP Team','Nama Logo','Link Logo Team','Drop Zone Erangel','Drop Zone Miramar','Drop Zone Rondo']);
  assert.ok(all.sheet.includes("https://panboy.example/api/images/safe.png"));
  const none=generate(teams,{...config,playersEnabled:false});
  assert.deepEqual(Array.from(none.columns),['Nama Team']);
});

test('Legacy event tanpa pilihan Excel baru tetap menampilkan Nick dan ID',()=>{
  const legacy=generate(teams,{...config,excelNicknameEnabled:undefined,excelPlayerIdEnabled:undefined});
  assert.ok(legacy.columns.includes('Nick Player 1'));
  assert.ok(legacy.columns.includes('ID Player 1'));
});

test('Nama tim dan judul diperlakukan sebagai string XML, tidak sebagai formula',()=>{
  const {sheet}=generate([{teamName:'=HYPERLINK("https://evil", "X") < &',players:[]}],config);
  assert.match(sheet,/t="inlineStr"/);
  assert.match(sheet,/&lt; &amp;/);
  assert.ok(!sheet.includes('<f>'));
});
