import test from "node:test";
import assert from "node:assert/strict";
import { parseRupiah, paymentStatus } from "../lib/midtrans.ts";

test("nominal Rupiah dibaca dari label event", () => {
  assert.equal(parseRupiah("Rp30.000 / Tim"), 30000);
  assert.equal(parseRupiah("Gratis"), 0);
});

test("status Midtrans dipetakan dengan aman", () => {
  assert.equal(paymentStatus("settlement"), "paid");
  assert.equal(paymentStatus("capture", "challenge"), "pending");
  assert.equal(paymentStatus("expire"), "failed");
  assert.equal(paymentStatus("refund"), "refunded");
});
