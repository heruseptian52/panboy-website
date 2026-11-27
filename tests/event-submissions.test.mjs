import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url), ts = require('typescript');
function load(path, mocks) {
  const exports = {}, source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(source, { exports, require: id => { if (!(id in mocks)) throw Error(`Unexpected import: ${id}`); return mocks[id]; }, Response, Request, FormData, File, Uint8Array, Date, crypto, String, Number, JSON, URL, console });
  return exports;
}
class D1 {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  prepare(sql) {
    const db = this.db; let args = [];
    return {
      bind(...values) { args = values; return this; },
      async run() { const out = db.prepare(sql).run(...args); return { meta: { changes: out.changes, last_row_id: Number(out.lastInsertRowid) } }; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
    };
  }
  async batch(statements) {
    this.db.exec('BEGIN');
    try { const result = []; for (const statement of statements) result.push(await statement.run()); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
const db = new D1(), uploads = new Map(), env = { DB: db, BUCKET: { async put(key, bytes) { uploads.set(key, bytes); }, async get(key) { const value=uploads.get(key); return value && {arrayBuffer:async()=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)}; }, async delete(key) { uploads.delete(key); } } };
const submission = load('../lib/event-submissions.ts', { 'cloudflare:workers': { env } });
const publicRoute = load('../app/api/event-submissions/route.ts', {
  'cloudflare:workers': { env }, '../../../lib/event-submissions': submission,
  '../../../lib/uploaded-image': { detectUploadedImage: bytes => bytes[0] === 0x89 ? { extension: 'png', contentType: 'image/png' } : null },
  '../../../lib/events': { normalizeWhatsapp: value => value.startsWith('0') ? `62${value.slice(1)}` : value },
});
const admin = { email: 'qa@example.invalid', events: true };
const adminRoute = load('../app/api/admin/event-submissions/route.ts', {
  'cloudflare:workers': { env }, '../../../../lib/admin-auth': { requirePermission: async () => admin },
  '../../../../lib/audit': { audit: async () => {} }, '../../../../lib/events': { ensureEventsTable: async () => {
    db.db.exec(`CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,event_date TEXT,start_date TEXT,end_date TEXT,prizepool TEXT,registration_fee TEXT,image_url TEXT,category TEXT,status TEXT,whatsapp TEXT,event_mode TEXT,city TEXT,province TEXT,address TEXT,max_slots INTEGER,sort_order INTEGER,created_at TEXT,deleted_at TEXT DEFAULT '');`);
  } }, '../../../../lib/event-submissions': submission,
});
function form() {
  const f = new FormData();
  for (const [key, value] of Object.entries({ title: 'UJI EVENT', organizer: 'Panboy QA', whatsapp: '081545910291', startDate: '2027-01-15', endDate: '2027-01-16', eventMode: 'Online', registrationFee: 'Gratis' })) f.set(key, value);
  f.set('poster', new File([new Uint8Array([0x89,0x50,0x4e,0x47,1,2,3])], 'qa.png', { type: 'image/png' })); return f;
}
test('pengajuan valid tersimpan menunggu admin, tanpa menerbitkan event', async () => {
  const response = await publicRoute.POST(new Request('http://localhost/api/event-submissions', { method: 'POST', body: form() }));
  assert.equal(response.status, 200);
  const pending = db.db.prepare('SELECT * FROM event_submissions').get();
  assert.equal(pending.status, 'PENDING'); assert.equal(pending.title, 'UJI EVENT'); assert.equal(uploads.size, 1);
  assert.match(pending.image_url, /^\/api\/images\/event-submissions/);
});
test('tanpa poster ditolak dan tidak menambah pengajuan', async () => {
  const f = form(); f.delete('poster');
  const response = await publicRoute.POST(new Request('http://localhost/api/event-submissions', { method: 'POST', body: f }));
  assert.equal(response.status, 400);
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM event_submissions').get().n, 1);
});
test('persetujuan menerbitkan satu event; klik ulang tidak menggandakan', async () => {
  const request = () => new Request('http://localhost/api/admin/event-submissions', { method: 'POST', body: JSON.stringify({ id: 1, action: 'approve' }) });
  const response = await adminRoute.POST(request()); assert.equal(response.status, 200, await response.text());
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
  assert.equal(db.db.prepare('SELECT status FROM event_submissions WHERE id=1').get().status, 'APPROVED');
  assert.equal(db.db.prepare('SELECT category FROM events').get().category, 'Community Event');
  assert.equal((await adminRoute.POST(request())).status, 409);
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
});
test('penolakan tetap tersembunyi dari daftar event', async () => {
  const newForm = form(); newForm.set('title', 'DITOLAK');
  assert.equal((await publicRoute.POST(new Request('http://localhost/api/event-submissions', { method: 'POST', body: newForm }))).status, 200);
  const response = await adminRoute.POST(new Request('http://localhost/api/admin/event-submissions', { method: 'POST', body: JSON.stringify({ id: 2, action: 'reject', reason: 'Poster tidak sesuai' }) }));
  assert.equal(response.status, 200); assert.equal(db.db.prepare('SELECT status FROM event_submissions WHERE id=2').get().status, 'REJECTED');
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
});
test('poster yang sudah diunggah bertahap tersimpan bersama pengajuan', async () => {
  const key = 'event-submissions/123e4567-e89b-12d3-a456-426614174000.png';
  uploads.set(key, new Uint8Array([0x89,0x50,0x4e,0x47,1,2,3]));
  const f = form(); f.delete('poster'); f.set('posterUrl', `/api/images/${encodeURIComponent(key)}`);
  const response = await publicRoute.POST(new Request('http://localhost/api/event-submissions', { method: 'POST', body: f }));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(db.db.prepare('SELECT image_url FROM event_submissions ORDER BY id DESC LIMIT 1').get().image_url, `/api/images/${encodeURIComponent(key)}`);
});
