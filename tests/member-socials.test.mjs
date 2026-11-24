import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInstagram, normalizeTiktok } from "../lib/member-socials.ts";

test("Instagram menerima username atau link",()=>{
  assert.deepEqual(normalizeInstagram("@panboycommunity"),{username:"@panboycommunity",url:"https://www.instagram.com/panboycommunity/"});
  assert.deepEqual(normalizeInstagram(""),{username:"",url:""});
});

test("TikTok menerima username atau link dan kosong tetap tersembunyi",()=>{
  assert.deepEqual(normalizeTiktok("https://www.tiktok.com/@panboycommunity"),{username:"@panboycommunity",url:"https://www.tiktok.com/@panboycommunity"});
  assert.deepEqual(normalizeTiktok(""),{username:"",url:""});
});
