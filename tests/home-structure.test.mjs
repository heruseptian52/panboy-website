import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('page.tsx',fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function tag(n){return ts.isJsxElement(n)?n.openingElement.tagName.getText(source):''}
function descendants(n,predicate){const found=[];function visit(x){if(predicate(x))found.push(x);ts.forEachChild(x,visit)}ts.forEachChild(n,visit);return found}
test('header only contains navigation; content sections cannot enlarge header',()=>{const headers=descendants(source,n=>tag(n)==='header');assert.equal(headers.length,1);assert.equal(descendants(headers[0],n=>tag(n)==='section').length,0);assert.equal(descendants(headers[0],n=>tag(n)==='h2'||tag(n)==='h3').length,0)});
test('member and service sections are direct siblings after event catalog, outside navigation',()=>{const raw=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');assert(raw.indexOf('className="container refresh-members"')>raw.indexOf('after_events'));assert(raw.indexOf('className="container refresh-services"')>raw.indexOf('</header>'));assert.equal((raw.match(/className="container refresh-members"/g)||[]).length,1)});
