# Panboy Community — Panduan Developer

## Ringkasan

Panboy Community adalah website event esports dan membership dengan tema black & gold. Domain utama: `panboycommunity.my.id`.

## Struktur penting

- `app/` — halaman website dan API route
- `app/admin/` — dashboard admin
- `app/member/` — halaman member dan pembayaran iuran
- `app/digital-store/` — halaman Digital Store
- `lib/` — akses database, settings, autentikasi, dan integrasi supplier
- `public/` — logo, poster, dan aset publik
- `.openai/hosting.json` — identitas project hosting, jangan dihapus

## Fitur yang sudah tersedia

- Event, registrasi, leaderboard, member, benefit, dan company profile
- Admin dengan pembatasan akses
- Pengaturan tampilan dan konten dari database
- Pembayaran member melalui struktur payment gateway yang sudah tersedia
- Digital Store dengan katalog, pencarian, FAQ, cara top up, cek transaksi, markup, dan kebutuhan input per kategori
- Helper backend Digiflazz dan halaman sinkronisasi yang siap dihubungkan setelah credential resmi tersedia
- Sitemap dan robots untuk SEO

## Menjalankan project

```bash
npm run install:ci
npm run build
npm run dev
```

Jangan reset database. Gunakan migration atau `CREATE TABLE IF NOT EXISTS` untuk perubahan baru.

## Environment variable

Nama variable boleh disiapkan, tetapi nilainya harus diisi melalui Secrets hosting dan tidak boleh masuk source code atau GitHub.

- `DIGIFLAZZ_USERNAME`
- `DIGIFLAZZ_API_KEY`
- `DIGIFLAZZ_MODE`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `MIDTRANS_MERCHANT_ID`
- `MIDTRANS_ENVIRONMENT`
- credential iPaymu sesuai dokumentasi akun

## Aturan keamanan

- Credential hanya digunakan di backend.
- Jangan mencetak API key, server key, signature, atau response sensitif ke log.
- Webhook payment dan supplier harus diverifikasi dan idempotent.
- Jangan mengubah data existing tanpa backup dan migration aman.
- Jangan menghapus fitur Event, Member, Leaderboard, atau database lama.

## Digital Store

Pengaturan markup berada di `Admin → Top Up`. Kebutuhan input kategori dapat diedit di `Admin → INPUT DIGITAL` atau `/admin/topup/requirements`.

Integrasi supplier belum boleh dianggap aktif sebelum connection test, sync, payment webhook, dan order supplier diuji menggunakan credential resmi.

## Deploy

Commit perubahan ke branch `main`, build harus berhasil, lalu deploy ke project hosting yang terdaftar di `.openai/hosting.json`. Domain Rumahweb hanya berfungsi sebagai domain; jangan mengubah DNS tanpa memastikan target deployment.
