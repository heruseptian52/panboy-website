import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/images/[...key]/route.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;

test("privileged admin can view old payment proof URLs, anonymous visitors cannot", async () => {
  let fetched = 0;
  const mods = {
    "cloudflare:workers": {env:{BUCKET:{
      async get(){fetched++;return {body:"proof",size:5,httpMetadata:{contentType:"image/png"}}},
      async head(){return {size:5,httpMetadata:{contentType:"image/png"}}},
    }}},
    "../../../../lib/admin-auth": {
      requirePermission: async (request, permission) =>
        permission === "memberDues" && request.headers.get("cookie") === "fixture-admin",
    },
  };
  const exports = {};
  runInNewContext(code,{exports,require:name=>mods[name],Request,Response,Headers});
  const request = (key,headers={}) => exports.GET(new Request("https://panboy.example/media",{headers}),{
    params:Promise.resolve({key:[key]}),
  });
  assert.equal((await request("member-payment-proofs/demo.png")).status,404);
  assert.equal((await request("roster-tmp/123/part-0")).status,404);
  assert.equal(fetched,0);
  const admin = await request("member-payment-proofs/demo.png",{cookie:"fixture-admin"});
  assert.equal(admin.status,200);
  assert.equal(admin.headers.get("Cache-Control"),"private, no-store");
  const range = await request("member-payment-proofs/demo.png",{cookie:"fixture-admin",range:"bytes=0-2"});
  assert.equal(range.status,206);
  assert.equal(range.headers.get("Cache-Control"),"private, no-store");
  assert.equal((await request("uploads/public.png")).status,200);
});
