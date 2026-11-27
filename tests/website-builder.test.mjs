import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const load=path=>{const exports={};Function("exports",ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);return exports;};
const {validLink,parseBlocks}=load("../lib/website-builder-model.ts");
const {displaySize}=load("../lib/display-size.ts");
test("capacity formatting",()=>{assert.equal(displaySize(524288000,"MB"),"500 MB");assert.equal(displaySize(2**30),"1 GB");assert.equal(displaySize(1024),"1 KB");assert.equal(displaySize(null),"Tidak tersedia");});
test("validates builder links",()=>{for(const s of ["javascript:alert(1)","//example.com","/\\example.com","data:text/html,x"])assert.equal(validLink(s),false);for(const s of ["/member","#test","https://example.com"])assert.equal(validLink(s),true);assert.throws(()=>parseBlocks([{title:"x",href:"javascript:alert(1)"}]));assert.equal(parseBlocks([{title:"x",enabled:true}])[0].enabled,true);});
