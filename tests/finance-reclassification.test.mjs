import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url), ts = require('typescript');
const source = ts.transpileModule(readFileSync(new URL('../lib/finance-reclassification.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup(linked) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE community_members(id INTEGER PRIMARY KEY);
    CREATE TABLE member_payments(id INTEGER PRIMARY KEY, member_id INTEGER, team_name TEXT, amount INTEGER, status TEXT);
    CREATE TABLE finance_member_cash_transfers(source_payment_id INTEGER PRIMARY KEY, amount INTEGER, reason TEXT, created_at TEXT);
    INSERT INTO member_payments VALUES(17,8,'ELIPSE ALPHA ESPORT',10000,'LUNAS'),(52,39,'VARD MAN',10000,'LUNAS');
    INSERT INTO finance_member_cash_transfers VALUES(17,10000,'lama','2026-11-17'),(52,10000,'lama','2026-11-17');`);
  if (linked) sqlite.exec('INSERT INTO community_members(id) VALUES(8),(39)');
  else sqlite.exec('INSERT INTO community_members(id) VALUES(39)');
  const db = { prepare(sql) { let args = []; return {
    bind(...values) { args = values; return this; },
    async run() { return sqlite.prepare(sql).run(...args); },
    async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    async first() { return sqlite.prepare(sql).get(...args) || null; },
  }; }, async batch(statements) { for (const item of statements) await item.run(); } };
  const exports = {};
  runInNewContext(source, { exports, require: id => { if (id !== 'cloudflare:workers') throw Error(id); return { env: { DB: db } }; }, Number, String, Date });
  return { sqlite, historicalCashTransferred: exports.historicalCashTransferred };
}

test('iuran dua tim bernama lama tetap pada member dan pengalihan historis dibalik tanpa menghapus transaksi', async () => {
  const { sqlite, historicalCashTransferred } = setup(true);
  assert.equal(await historicalCashTransferred(), 0);
  assert.equal(await historicalCashTransferred(), 0);
  assert.deepEqual(sqlite.prepare('SELECT status FROM finance_member_cash_transfers ORDER BY source_payment_id').all().map(x => x.status), ['REVERSED', 'REVERSED']);
  assert.equal(sqlite.prepare("SELECT SUM(amount) AS total FROM member_payments WHERE status='LUNAS'").get().total, 20000);
});

test('iuran yang benar-benar belum terhubung tetap dicatat sebagai kas historis', async () => {
  const { sqlite, historicalCashTransferred } = setup(false);
  assert.equal(await historicalCashTransferred(), 10000);
  assert.deepEqual(sqlite.prepare('SELECT status FROM finance_member_cash_transfers ORDER BY source_payment_id').all().map(x => x.status), ['ACTIVE', 'REVERSED']);
});
