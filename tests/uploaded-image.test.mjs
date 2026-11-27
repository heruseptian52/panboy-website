import test from "node:test";
import assert from "node:assert/strict";
import { detectUploadedImage } from "../lib/uploaded-image.ts";

const bytes=(values)=>new Uint8Array(values);
const text=(value)=>new TextEncoder().encode(value);

test("mendeteksi format gambar dari isi file, bukan MIME browser",()=>{
  assert.equal(detectUploadedImage(bytes([0xff,0xd8,0xff,0xdb]))?.extension,"jpg");
  assert.equal(detectUploadedImage(bytes([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.extension,"png");
  assert.equal(detectUploadedImage(text("RIFF1234WEBP"))?.extension,"webp");
  assert.equal(detectUploadedImage(text("GIF89a"))?.extension,"gif");
  assert.equal(detectUploadedImage(bytes([0x42,0x4d,0,0]))?.extension,"bmp");
  assert.equal(detectUploadedImage(bytes([0,0,0,0,0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66]))?.extension,"avif");
});

test("menolak file yang bukan gambar",()=>{
  assert.equal(detectUploadedImage(text("dokumen biasa")),null);
});
