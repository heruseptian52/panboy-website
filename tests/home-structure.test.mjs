import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('page.tsx',fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function tag(n){return ts.isJsxElement(n)?n.openingElement.tagName.getText(source):''}
function descendants(n,predicate){const found=[];function visit(x){if(predicate(x))found.push(x);ts.forEachChild(x,visit)}ts.forEachChild(n,visit);return found}
test('header only contains navigation; content sections cannot enlarge header',()=>{const headers=descendants(source,n=>tag(n)==='header');assert.equal(headers.length,1);assert.equal(descendants(headers[0],n=>tag(n)==='section').length,0);assert.equal(descendants(headers[0],n=>tag(n)==='h2'||tag(n)==='h3').length,0)});
test('member and service sections are direct siblings after event catalog, outside navigation',()=>{const raw=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');assert(raw.indexOf('className="container refresh-members"')>raw.indexOf('after_events'));assert(raw.indexOf('className="container refresh-services"')>raw.indexOf('</header>'));assert.equal((raw.match(/className="container refresh-members"/g)||[]).length,1)});
test('market preview is placed immediately above member showcase',()=>{const raw=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');assert(raw.indexOf('<HomeMarket settings=')>raw.indexOf('after_events'));assert(raw.indexOf('<HomeMarket settings=')<raw.indexOf('className="container refresh-members"'))});
test('home market renders two distinct panels, only supplied publications and direct detail/apply links',async()=>{
 const {runInNewContext}=await import('node:vm'),React=await import('react'),jsx=await import('react/jsx-runtime'),{renderToStaticMarkup}=await import('react-dom/server');const exports={};
 const code=ts.transpileModule(fs.readFileSync(new URL('../app/esports-market/home-market.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(code,{exports,require:id=>id==='react/jsx-runtime'?jsx:id==='../panboy-icon'?{default:()=>React.createElement('span')}:{}});
 const props={settings:{player:true,team:true},items:[{id:3,kind:'player',data:{name:'QA PLAYER',role:'IGL'}},{id:4,kind:'team',data:{name:'QA TEAM',position:'Coach'}}]};
 const html=renderToStaticMarkup(React.createElement(exports.HomeMarket,props));assert(html.indexOf('Transfer Market Player')<html.indexOf('Team Recruitment'));assert.match(html,/QA PLAYER/);assert.match(html,/QA TEAM/);assert.match(html,/kind=player&amp;post=3/);assert.match(html,/kind=team&amp;apply=1/);assert.doesNotMatch(html,/Belum ada publikasi/);
 const disabled=renderToStaticMarkup(React.createElement(exports.HomeMarket,{...props,settings:{player:false,team:true}}));assert.doesNotMatch(disabled,/QA PLAYER/);assert.match(disabled,/QA TEAM/);
});
