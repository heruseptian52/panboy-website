import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports = {};
const source = ts.transpileModule(readFileSync(new URL('../lib/event-balance.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
runInNewContext(source, { exports, require: () => ({ env: {} }), Number, String, Object, Math });
const { calculateEventBalances } = exports;

test('saldo event kedua melanjutkan saldo event pertama untuk seluruh member', () => {
  const teams = [{ memberId: 1, teamName: 'A' }, { memberId: 2, teamName: 'B' }, { memberId: 3, teamName: 'NONAKTIF' }];
  const payments = [
    { memberId: 1, teamName: 'A', date: '2026-11-01', amount: 60000 },
    { memberId: 2, teamName: 'B', date: '2026-11-02', amount: 30000 },
    { memberId: 1, teamName: 'A', date: '2026-12-01', amount: 100000 },
  ];
  const cuts = [
    { memberId: 1, periodId: 1, startDate: '2026-11-03', amount: 10000 },
    { memberId: 2, periodId: 1, startDate: '2026-11-03', amount: 10000 },
    { memberId: 1, periodId: 2, startDate: '2026-11-18', amount: 10000 },
    { memberId: 2, periodId: 2, startDate: '2026-11-18', amount: 10000 },
    { memberId: 1, periodId: 3, startDate: '2026-12-02', amount: 10000 },
  ];
  const first = calculateEventBalances({ id: 1, startDate: '2026-11-03', nextStartDate: '2026-11-18', asOfDate: '2026-11-20' }, teams, payments, cuts, {});
  const second = calculateEventBalances({ id: 2, startDate: '2026-11-18', asOfDate: '2026-11-20' }, teams, payments, cuts, {});
  assert.deepEqual([first[0].opening, first[0].current, first[0].closing], [60000, 10000, 50000]);
  assert.deepEqual([second[0].opening, second[0].current, second[0].closing], [50000, 10000, 40000]);
  assert.deepEqual([second[1].opening, second[1].current, second[1].closing], [20000, 10000, 10000]);
  assert.deepEqual([second[2].opening, second[2].current, second[2].closing], [0, 0, 0]);
});

test('iuran manual pada bulan yang sama tidak menggandakan pembayaran', () => {
  const period = { id: 2, startDate: '2026-11-18', asOfDate: '2026-11-20' };
  const team = [{ memberId: 1, teamName: 'A' }];
  const payments = [{ memberId: 1, teamName: 'A', date: '2026-11-01', amount: 60000 }];
  const dues = { '2026-11:1': { status: 'SUDAH BAYAR', amount: '60000', paidAt: '2026-11-01' } };
  assert.equal(calculateEventBalances(period, team, payments, [], dues)[0].closing, 60000);
});

test('iuran setelah tanggal event tetap masuk ke laporan periode terbaru, bukan periode sebelumnya', () => {
  const team = [{ memberId: 46, teamName: 'VXRAEN ESPORT' }];
  const payments = [
    { memberId: 46, teamName: 'VXRAEN ESPORT', date: '2026-10-15', amount: 10000 },
    { memberId: 46, teamName: 'VXRAEN ESPORT', date: '2026-11-17', amount: 10000 },
  ];
  const cuts = [{ memberId: 46, periodId: 3, startDate: '2026-11-05', amount: 10000 }];
  const october = calculateEventBalances({ id: 2, startDate: '2026-10-04', nextStartDate: '2026-11-05', asOfDate: '2026-11-18' }, team, payments, cuts, {});
  const november = calculateEventBalances({ id: 3, startDate: '2026-11-05', asOfDate: '2026-11-18' }, team, payments, cuts, {});
  assert.deepEqual([october[0].opening, october[0].current, october[0].closing], [10000, 0, 10000]);
  assert.deepEqual([november[0].opening, november[0].current, november[0].closing], [20000, 10000, 10000]);
});

test('saldo admin mengaitkan pembayaran nama lama dengan ID member yang sama', async () => {
  const db = { prepare(sql) { return {
    async all() {
      if (sql.includes('FROM community_members')) return { results: [
        { id: 8, teamName: 'ECLIPSE ALPHA ESPORT', active: 1, billingEnabled: 1 },
        { id: 39, teamName: 'VARD ESPORT', active: 1, billingEnabled: 1 },
      ] };
      if (sql.includes('FROM member_payments')) return { results: [
        { memberId: 8, teamName: 'ELIPSE ALPHA ESPORT', month: '2026-09', total: 10000, tier: 'C' },
        { memberId: 8, teamName: 'ECLIPSE ALPHA ESPORT', month: '2026-10', total: 50000, tier: 'C' },
        { memberId: 39, teamName: 'VARD MAN', month: '2026-10', total: 10000, tier: 'C' },
        { memberId: 39, teamName: 'VARD ESPORT', month: '2026-10', total: 10000, tier: 'C' },
        { memberId: 39, teamName: 'VARD ESPORT', month: '2026-11', total: 10000, tier: 'C' },
      ] };
      if (sql.includes('FROM finance_member_deductions')) return { results: [
        { memberId: 8, total: 20000 }, { memberId: 39, total: 10000 },
      ] };
      throw Error(sql);
    },
    async first() { return { value: '{}' }; },
  }; } };
  const routeExports = {};
  const routeSource = ts.transpileModule(readFileSync(new URL('../app/api/admin/finance/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mocks = {
    'cloudflare:workers': { env: { DB: db } },
    '../../../../lib/admin-auth': { requirePermission: async () => true },
    '../../../../lib/audit': { audit: async () => {} },
    '../../../../lib/finance-pdf': {}, '../../../../lib/simple-xlsx': {},
    '../../../../lib/finance-schema': {},
    '../../../../lib/member-billing': { ensureMemberBillingPreferences: async () => {} },
    '../../../../lib/other-expenses': {}, '../../../../lib/finance-reclassification': {},
    '../../../../lib/event-balance': {},
  };
  runInNewContext(routeSource, { exports: routeExports, require: id => mocks[id] || (() => { throw Error(id); })(), Date, Number, String, Boolean, Object, Map, Set, Math, JSON });
  const rows = await routeExports.teamBalances();
  assert.deepEqual(rows.map(row => [row.totalIncome, row.totalAllocated, row.balance]), [[60000, 20000, 40000], [30000, 10000, 20000]]);
});
