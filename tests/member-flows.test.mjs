import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const packages = { C: Object.fromEntries([1,2,3,4,5,6,7,8,9,10,11,12,36,120].map(n => [n, n*10000])), S: Object.fromEntries([1,2,3,4,5,6,7,8,9,10,11,12,36,120].map(n => [n, n*100000])) };
function load(path, mocks) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(`Unexpected import ${id}`); return mocks[id]; }, Response, Request, URL, Date, Number, Object, String, JSON, Array, Boolean, Error, console });
  return exports;
}
const correction = load('../lib/member-dues-correction.ts', { './member-payments': { MEMBERSHIP_PACKAGES: packages } });
class MemoryDB {
  constructor(member) { this.member = member; this.dues = '{}'; this.laterPayment = false; }
  prepare(sql) {
    const db = this;
    return {
      args: [], bind(...args) { this.args = args; return this; },
      async first() {
        if (sql.includes('FROM community_members WHERE id=?')) return db.member?.id === this.args[0] ? { ...db.member } : null;
        if (sql.includes('FROM member_billing_preferences')) return null;
        if (sql.includes("FROM site_settings WHERE key='memberDuesJson'")) return { value: db.dues };
        if (sql.includes('FROM member_payments')) return db.laterPayment && sql.includes('verified_at>?') ? { id: 99 } : null;
        throw Error(`Unexpected SELECT: ${sql}`);
      },
      async run() {
        if (sql.includes('INSERT INTO site_settings')) { db.dues = this.args[0]; return { meta: { changes: 1 } }; }
        if (sql.includes('UPDATE community_members SET active=?,membership_start=?')) {
          [db.member.active, db.member.membership_start, db.member.membership_end, db.member.membership_tier] = this.args;
          return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE community_members SET active=?,membership_end=CASE')) {
          db.member.active = this.args[0];
          if (this.args[1]) db.member.membership_end = '';
          return { meta: { changes: 1 } };
        }
        throw Error(`Unexpected UPDATE: ${sql}`);
      },
    };
  }
  async batch(statements) { return Promise.all(statements.map(s => s.run())); }
}
const owner = { email: 'qa@example.invalid', isOwner: true, members: true };
function duesHandler(db) { return load('../app/api/admin/member-dues/route.ts', {
  'cloudflare:workers': { env: { DB: db } }, '../../../../lib/admin-auth': { requestAdmin: async () => owner },
  '../../../../lib/audit': { audit: async () => {} },
  '../../../../lib/member-dues-correction': correction,
  '../../../../lib/member-billing': { ensureMemberBillingPreferences: async () => {} },
}).POST; }
async function post(handler, action, months, paidAt) {
  const response = await handler(new Request('http://localhost/api/admin/member-dues', { method: 'POST', body: JSON.stringify({ memberId: 7, month: paidAt.slice(0,7), tier: 'C', months, paidAt, action }) }));
  if (response.status !== 200) assert.fail(`HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
test('iuran baru mengaktifkan team, koreksi tidak menggandakan bulan, batal mengembalikan data awal', async () => {
  const db = new MemoryDB({ id: 7, team_name: 'TEAM UJI', membership_start: '', membership_end: '', membership_tier: '', active: 0 });
  const handler = duesHandler(db);
  const paidAt = new Date().toISOString().slice(0,10);
  await post(handler, 'save', 1, paidAt);
  assert.equal(db.member.membership_end, correction.manualPeriodEnd('', paidAt, 1));
  assert.equal(db.member.active, 1);
  assert.equal(JSON.parse(db.dues)[`${paidAt.slice(0,7)}:7`].amount, '10000');
  await post(handler, 'save', 3, paidAt);
  assert.equal(db.member.membership_end, correction.manualPeriodEnd('', paidAt, 3));
  assert.equal(JSON.parse(db.dues)[`${paidAt.slice(0,7)}:7`].amount, '30000');
  await post(handler, 'cancel', 3, paidAt);
  assert.equal(db.member.membership_end, '');
  assert.equal(db.member.active, 0);
  assert.equal(db.member.membership_tier, '');
  assert.equal(JSON.parse(db.dues)[`${paidAt.slice(0,7)}:7`], undefined);
});
test('iuran expired dimulai dari tanggal bayar dan pembatalan mengembalikan expiry lama', async () => {
  const db = new MemoryDB({ id: 7, team_name: 'TEAM UJI', membership_start: '2020-09-18', membership_end: '2020-10-18', membership_tier: 'TIER C', active: 0 });
  const handler = duesHandler(db);
  const paidAt = new Date().toISOString().slice(0,10);
  await post(handler, 'save', 1, paidAt);
  assert.equal(db.member.membership_end, correction.manualPeriodEnd('2020-10-18', paidAt, 1));
  await post(handler, 'cancel', 1, paidAt);
  assert.equal(db.member.membership_end, '2020-10-18');
  assert.equal(db.member.active, 0);
});
test('pembatalan catatan lama ditolak jika sudah ada pembayaran berikutnya', async () => {
  const db = new MemoryDB({ id: 7, team_name: 'TEAM UJI', membership_start: '', membership_end: '', membership_tier: '', active: 0 });
  const handler = duesHandler(db);
  const paidAt = new Date().toISOString().slice(0,10);
  await post(handler, 'save', 1, paidAt);
  const currentEnd = db.member.membership_end;
  db.laterPayment = true;
  const response = await handler(new Request('http://localhost/api/admin/member-dues', { method: 'POST', body: JSON.stringify({ memberId: 7, month: paidAt.slice(0,7), action: 'cancel' }) }));
  assert.equal(response.status, 409);
  assert.equal(db.member.membership_end, currentEnd);
  assert.ok(JSON.parse(db.dues)[`${paidAt.slice(0,7)}:7`]);
});
test('tombol aktifkan expired dan nonaktifkan hanya mengubah status serta menjaga data team', async () => {
  const db = new MemoryDB({ id: 7, team_name: 'TEAM UJI', membership_end: '2020-10-18', active: 1 });
  const handler = load('../app/api/admin/members/route.ts', {
    'cloudflare:workers': { env: { DB: db } }, '../../../../lib/audit': { audit: async () => {} },
    '../../../../lib/members': { normalizeMemberName: x => x }, '../../../../lib/member-socials': { normalizeInstagram: () => ({}), normalizeTiktok: () => ({}) },
    '../../../../lib/admin-auth': { requirePermission: async () => owner },
  }).PATCH;
  for (const active of [true, false]) {
    const response = await handler(new Request('http://localhost/api/admin/members', { method: 'PATCH', body: JSON.stringify({ id: 7, field: 'status', active }) }));
    if (response.status !== 200) assert.fail(`HTTP ${response.status}: ${await response.text()}`);
    assert.equal(db.member.active, active ? 1 : 0);
  }
  assert.equal(db.member.membership_end, '');
  assert.equal(db.member.team_name, 'TEAM UJI');
});
test('team nonaktif dapat membuat tagihan QRIS dan iPaymu untuk aktif kembali', async () => {
  const inactive = { id: 7, teamName: 'TEAM UJI', active: false, whatsapp: '081234567890' };
  const requested = [];
  const getCommunityMembers = async all => { requested.push(all); return all === false ? [inactive] : []; };
  const inserted = [];
  const DB = { prepare: () => ({ bind(...args) { inserted.push(args); return this; }, async run() { return { meta: { changes: 1 } }; } }) };
  const common = {
    'cloudflare:workers': { env: { DB } },
    '../../../lib/members': { getCommunityMembers },
    '../../../lib/settings': { getSettings: async () => ({ memberQrisEnabled: 'true', memberIpaymuEnabled: 'true' }) },
    '../../../lib/member-payments': { ensureMemberPayments: async () => {}, invoice: () => 'QA-INVOICE', MEMBERSHIP_PACKAGES: packages },
  };
  const qris = load('../app/api/member-payments/route.ts', common).POST;
  const response = await qris(new Request('http://localhost/api/member-payments', { method: 'POST', body: JSON.stringify({ memberId: 7, tier: 'C', months: 1 }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).invoice, 'QA-INVOICE');
  const ipaymu = load('../app/api/payments/member/route.ts', {
    ...common,
    '../../../../lib/members': { getCommunityMembers },
    '../../../../lib/settings': common['../../../lib/settings'],
    '../../../../lib/member-payments': common['../../../lib/member-payments'],
    '../../../../lib/ipaymu': { ipaymuConfig: () => ({ enabled: true }), createIPaymuPayment: async () => ({ redirectUrl: 'https://example.invalid/pay' }) },
  }).POST;
  const second = await ipaymu(new Request('http://localhost/api/payments/member', { method: 'POST', body: JSON.stringify({ memberId: 7, tier: 'C', months: 1 }) }));
  if (second.status !== 200) assert.fail(`iPaymu HTTP ${second.status}: ${await second.text()}`);
  assert.deepEqual(requested, [false, false]);
  assert.equal(inserted.length, 2);
});
test('SQL nyata menyimpan status, iuran, dan pemilahan publik/pembayaran', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE community_members (
    id INTEGER PRIMARY KEY, team_name TEXT, whatsapp TEXT DEFAULT '', logo_url TEXT DEFAULT '',
    logo_x INTEGER DEFAULT 0, logo_y INTEGER DEFAULT 0, logo_scale INTEGER DEFAULT 100,
    instagram_username TEXT DEFAULT '', instagram_url TEXT DEFAULT '', tiktok_username TEXT DEFAULT '', tiktok_url TEXT DEFAULT '',
    player_photo_1_url TEXT DEFAULT '', player_photo_2_url TEXT DEFAULT '',
    player_photo_1_x INTEGER DEFAULT 42, player_photo_1_y INTEGER DEFAULT 0, player_photo_1_scale INTEGER DEFAULT 100,
    player_photo_2_x INTEGER DEFAULT 58, player_photo_2_y INTEGER DEFAULT 0, player_photo_2_scale INTEGER DEFAULT 100,
    active INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, membership_start TEXT DEFAULT '', membership_end TEXT DEFAULT '', membership_tier TEXT DEFAULT '', updated_at TEXT DEFAULT ''
  );
  CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE member_payments (id INTEGER PRIMARY KEY, member_id INTEGER, status TEXT, paid_at TEXT, verified_at TEXT, tier TEXT);
  CREATE TABLE member_billing_preferences (member_id INTEGER PRIMARY KEY, enabled INTEGER);`);
  sqlite.prepare('INSERT INTO community_members(id,team_name,active,membership_end) VALUES(?,?,?,?)').run(7, 'TEAM NONAKTIF', 0, '2020-01-01');
  sqlite.prepare('INSERT INTO community_members(id,team_name,active,membership_end) VALUES(?,?,?,?)').run(8, 'TEAM AKTIF', 1, '2099-01-01');
  const DB = {
    prepare(sql) { const statement = sqlite.prepare(sql); return {
      args: [], bind(...args) { this.args = args; return this; },
      async first() { return statement.get(...this.args) || null; },
      async all() { return { results: statement.all(...this.args) }; },
      async run() { return { meta: statement.run(...this.args) }; },
    }; },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
  };
  const members = load('../lib/members.ts', { 'cloudflare:workers': { env: { DB } } });
  assert.deepEqual((await members.getCommunityMembers()).map(x => x.teamName), ['TEAM AKTIF']);
  assert.deepEqual((await members.getCommunityMembers(false)).map(x => x.teamName).sort(), ['TEAM AKTIF', 'TEAM NONAKTIF']);
  const patch = load('../app/api/admin/members/route.ts', {
    'cloudflare:workers': { env: { DB } }, '../../../../lib/audit': { audit: async () => {} },
    '../../../../lib/members': { normalizeMemberName: x => x }, '../../../../lib/member-socials': { normalizeInstagram: () => ({}), normalizeTiktok: () => ({}) },
    '../../../../lib/admin-auth': { requirePermission: async () => owner },
  }).PATCH;
  const activated = await patch(new Request('http://localhost/api/admin/members', { method: 'PATCH', body: JSON.stringify({ id: 7, field: 'status', active: true }) }));
  assert.equal(activated.status, 200);
  assert.equal(sqlite.prepare('SELECT membership_end FROM community_members WHERE id=7').get().membership_end, '');
  assert.equal((await members.getCommunityMembers()).length, 2);
  await patch(new Request('http://localhost/api/admin/members', { method: 'PATCH', body: JSON.stringify({ id: 7, field: 'status', active: false }) }));
  assert.equal((await members.getCommunityMembers()).length, 1);
  const paidAt = new Date().toISOString().slice(0,10);
  const dues = duesHandler(DB);
  await post(dues, 'save', 1, paidAt);
  assert.equal(sqlite.prepare('SELECT active FROM community_members WHERE id=7').get().active, 1);
  assert.equal((await members.getCommunityMembers()).length, 2);
  await post(dues, 'cancel', 1, paidAt);
  assert.equal(sqlite.prepare('SELECT active,membership_end FROM community_members WHERE id=7').get().active, 0);
  assert.equal((await members.getCommunityMembers()).length, 1);
  sqlite.close();
});
