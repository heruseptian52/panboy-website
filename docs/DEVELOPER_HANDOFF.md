# Panboy Community — Developer Handoff

Dokumen ini menjadi titik awal developer lain untuk melanjutkan website.

## Project

- Domain produksi: `https://panboycommunity.my.id`
- Framework: Next/Vinext, React, TypeScript
- Hosting: Cloudflare Workers melalui Sites
- Database: Cloudflare D1 melalui binding `DB`
- Branch utama: `main`

## Menjalankan project

```bash
npm run install:ci
npm run build
npm run dev
```

Sebelum mengubah kode, buat branch baru. Jangan mengubah atau menghapus
`.openai/hosting.json`, migration lama, atau data produksi secara langsung.

## Area fitur

- `app/` — halaman publik dan route aplikasi
- `app/admin/` — dashboard dan pengaturan admin
- `app/api/` — endpoint backend
- `db/` — schema database
- `drizzle/` — migration database
- `lib/` — autentikasi, audit log, pembayaran, dan helper backend
- `public/` — aset publik
- `tests/` — pengujian otomatis

## Database dan environment

Database menggunakan binding `DB`. Gunakan migration baru untuk perubahan
schema; jangan reset database produksi. Gunakan `.env.example` sebagai daftar
nama variable. Nilai rahasia hanya boleh dimasukkan ke Secrets/Environment
Variables hosting.

## Checklist sebelum deploy

1. Jalankan `npm run build` dan test yang relevan.
2. Periksa migration dan kompatibilitas data lama.
3. Catat perubahan di `CHANGELOG.md`.
4. Simpan backup sebelum perubahan database berisiko.
5. Cek halaman publik dan dashboard admin setelah deploy.

## Paket untuk developer lain

Paket serah-terima berisi source, folder `docs/`, `PANDUAN-DEVELOPER.md`,
`CHANGELOG.md`, `.env.example`, schema, migration, dan test. Jangan masukkan
API key, password, token, credential produksi, atau file `.env` asli ke ZIP
atau email. Credential diberikan melalui Secrets atau password manager.
