# Panboy Community

Source code lengkap website **Panboy Community** (`https://panboycommunity.my.id`). Paket ini dapat dibuka di VS Code, disimpan di GitHub, dan diteruskan kepada developer lain tanpa bergantung pada satu editor.

## Versi paket

- Versi source: `2026.11.24`
- Basis website: Sites v411 (`55dded2`)
- Tanggal ekspor: `24 November 2026`
- Branch review: `codex/panboy-roster-audit`

Kandidat ini belum diterapkan ke produksi. Lihat `RELEASE_INFO.json`, `CHANGELOG.md`, dan `docs/AUDIT-2026-11-24.md`.

## Data Player Event

1. Admin membuka **Data Player Event** dan memilih pendataan yang sudah terhubung dengan event yang diposting.
2. Centang **Aktifkan link pendaftaran umum**, atur kuota dan batas waktu, lalu klik **Simpan Pengaturan**.
3. Pilih **Salin Link Pendaftaran Umum**. Link yang sama dapat dibagikan ke semua tim. Undangan pribadi tetap tersedia dan kedua jalur memakai kuota yang sama.
4. Untuk Excel, atur kolom yang ditampilkan dan simpan. **Download Excel** menghasilkan satu baris per tim pada satu sheet dengan pengaturan cetak A4 landscape satu halaman. Banyak tim atau kolom dapat membuat teks kecil saat dicetak.
5. Link edit peserta tetap pribadi. Mematikan link umum pada event terhubung menghentikan pendaftaran umum dan tetap mengizinkan edit sebelum tenggat.

Opsi baru memakai kolom `roster_events.options_json` yang sudah ada. Tidak ada migration SQL baru. File migration lama tetap disertakan untuk instalasi dan staging.

## Teknologi

- Next.js/Vinext, React, TypeScript
- Cloudflare Workers
- Cloudflare D1 (database), binding `DB`
- Cloudflare R2 (file/aset), binding `BUCKET`
- Drizzle ORM dan migration SQL

## Isi source

- `app/` — frontend, halaman admin, dan API/backend routes
- `lib/` — logika bisnis, autentikasi, payment, leaderboard, dan helper
- `db/` — koneksi dan schema database
- `drizzle/` — seluruh migration dan snapshot schema
- `public/` — asset publik
- `worker/` — entrypoint runtime Worker
- `tests/` — pengujian otomatis
- `.openai/hosting.json` — deklarasi binding dan project Sites
- `.env.example` — contoh environment variable tanpa nilai rahasia
- `docs/DEVELOPER_HANDOFF.md` dan `PANDUAN-DEVELOPER.md` — panduan lanjutan

## Persyaratan

- Node.js `>=22.13.0`
- npm
- Untuk script build resmi: Linux/WSL dengan `bash`, `flock`, `curl`, dan GNU `timeout`

## Instalasi dan menjalankan lokal

```bash
npm run install:ci
cp .env.example .env.local
npm run dev
```

Buka alamat lokal yang ditampilkan terminal. Isi hanya credential development/sandbox di `.env.local`. Jangan commit `.env.local`.

## Build dan test

```bash
npm run build
npm test
```

Test tertentu dapat dijalankan dengan:

```bash
node --test tests/*.test.mjs
```

## Database

Schema utama berada di `db/schema.ts`; riwayat perubahan berada di `drizzle/`. Database produksi menggunakan binding D1 bernama `DB`.

Untuk perubahan schema:

```bash
npm run db:generate
```

Buat migration baru dan review SQL sebelum diterapkan. Jangan menghapus migration lama, reset database produksi, atau menimpa data yang sudah ada. Backup database sebelum perubahan berisiko.

## Environment dan layanan

Gunakan `.env.example` sebagai daftar awal. Secret produksi harus dipasang melalui pengaturan environment hosting, bukan ditulis di source atau ZIP. Integrasi pembayaran/supplier hanya boleh diaktifkan setelah key resmi, callback, signature, dan mode sandbox/production diverifikasi.

## Deploy

1. Buat branch dan commit perubahan.
2. Jalankan build dan test yang relevan.
3. Periksa migration agar kompatibel dengan data lama.
4. Push ke repository tujuan/GitHub.
5. Pasang binding database `DB`, storage `BUCKET`, serta environment variable pada platform tujuan.
6. Deploy output Worker sesuai konfigurasi `vite.config.ts` dan `.openai/hosting.json`.
7. Uji halaman publik, login admin, event, member, leaderboard, pembayaran, dan keuangan.

Jika pindah platform, developer perlu menyediakan layanan setara untuk D1/R2 atau menyesuaikan adapter database/storage. Source aplikasi tetap dapat diedit di VS Code atau GitHub.

## Aturan setiap update

Setiap perubahan website wajib:

1. menaikkan nomor versi/tanggal di `RELEASE_INFO.json`, `package.json`, dan README;
2. mencatat perubahan di `CHANGELOG.md`;
3. menyertakan frontend, backend, schema, migration, konfigurasi, asset, test, dan dokumentasi;
4. menjalankan build/test yang relevan;
5. membuat ZIP source terbaru dari commit yang sama dengan versi deploy;
6. tidak memasukkan `.git`, `node_modules`, output build, file `.env`, token, password, atau API key;
7. tidak menghapus atau merusak data dan fitur yang sudah ada.

## Keamanan

- Jangan pernah membagikan secret produksi di source/ZIP.
- Credential hanya digunakan di backend.
- Verifikasi webhook dan buat proses payment idempotent.
- Jangan mencetak token, API key, atau signature ke log.

Hak pengembangan dan salinan source berada di bawah kendali pemilik Panboy Community.

## Logo data player event dan Google Drive

Form publik menerima file logo semua format maksimal 5 MB. File dikirim dalam bagian kecil agar tidak melewati batas permintaan server, kemudian disatukan di penyimpanan website; data team hanya bisa dikirim setelah proses upload selesai. Admin dapat mengisi link folder Google Drive per event di menu Data Player Event.

Link folder tidak dengan sendirinya memberikan izin upload. Agar sinkronisasi otomatis bekerja, hubungkan OAuth 2.0 Google Drive milik akun yang punya izin menulis ke folder tersebut, lalu simpan tiga nilai berikut sebagai **secret runtime** (jangan di ZIP/source): `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`. Token harus memiliki izin Drive untuk membuat file di folder tujuan. Setelah disiapkan, file baru otomatis dikirim saat data team disimpan. Bila koneksi belum siap atau gagal, logo tetap aman di penyimpanan website dan admin melihat statusnya serta dapat memilih **Coba Sinkron**.

## Pembaruan beranda premium

Desain utama menggunakan hitam charcoal, gold, dan bronze, font lokal, ikon Panboy seragam, akses cepat, kartu member aktual, layanan, serta navigasi bawah HP. CSS dibatasi pada `.panboy-main-refresh` agar admin dan halaman fitur tetap terjaga. Seluruh event, member, sponsor, pengaturan banner, carousel, musik, dan konten dinamis tetap dari database website utama. Tidak ada migration atau perubahan data keuangan. Preview dashboard terpisah tidak menggantikan dashboard produksi. Pemeriksaan browser terhalang kebijakan lingkungan; validasi dilakukan melalui build dan pemeriksaan source.

## Perbaikan layout header HP

Memindahkan bagian member dan layanan keluar dari header ke setelah katalog event. Header kini hanya berisi identitas dan navigasi, dengan tinggi otomatis dan menu horizontal yang dibatasi. Ikon beranda diseragamkan, ruang hero HP mengikuti konten, dan navigasi bawah tetap ringkas. Regresi struktur diuji dengan `node --test tests/home-structure.test.mjs`.

## Perbaikan koneksi iPaymu

Callback, return URL, dan cancel URL memiliki fallback HTTPS untuk domain utama. Signature tetap dihitung dari byte JSON yang benar-benar dikirim. Respons non-JSON, penolakan IP/domain/kredensial, dan URL checkout tidak valid ditangani dengan jelas. Log server menyimpan kode/status teknis yang telah disanitasi, bukan body permintaan, signature, atau kredensial. Uji integrasi terisolasi: `node --experimental-strip-types --test tests/ipaymu.test.mjs`. Aktivasi akun dan whitelist server tetap mengikuti kebijakan iPaymu.

### Hasil uji produksi 18 November 2026

Permintaan `POST https://my.ipaymu.com/api/v2/payment` dari hosting Sites mengembalikan HTTP 526 dengan content-type text/plain. Request website: 914420e8f9ead277402aca2f8057f57d, sekitar 09:07 WITA. Tidak ada invoice tersimpan karena upstream gagal sebelum INSERT. Ini adalah kegagalan validasi sertifikat HTTPS upstream; jangan mengubah callback menjadi HTTP atau mematikan validasi TLS. Dukungan iPaymu perlu memeriksa sertifikat, hostname, dan certificate chain endpoint Production untuk koneksi dari Cloudflare Workers. Sampai diperbaiki, QRIS PANBOY tersedia melalui alur manual yang sudah ada. Uji mock mencakup signature byte-exact, URL callback, respons error, host redirect dan TLS 526; enam uji lolos. Koneksi produksi dan callback sukses belum dapat divalidasi karena TLS upstream.

## Pendataan team per event
Admin Data Event dapat memilih isian player, logo dan tiga lokasi drop zone, memberi nama map, dan mengisi link undangan grup WhatsApp. Event lama memakai player dan logo aktif serta drop zone nonaktif. Isian yang dinonaktifkan tetap tersimpan ketika peserta mengedit data lain. Setelah menyimpan, peserta dapat menyalin ringkasan ke grup dan menyimpan tautan edit pribadi. Admin berizin event bisa mengambil tautan pemulihan per team tanpa membatalkan tautan peserta. Kedua tautan tunduk pada status dan batas waktu event. Migration 0050 menambah kolom JSON untuk pengaturan dan lokasi.

Admin Data Event dapat memilih **Hapus team** di kartu pendaftaran. Konfirmasi menampilkan nama team dan event. Setelah penghapusan, kedua link edit lama tidak berlaku dan nama team dapat digunakan lagi selama event terbuka.

## Judul banner beranda
Judul tiga baris memakai font semibold lokal, warna putih gading dan gold solid, serta ukuran responsif untuk HP dan desktop. Teks mengikuti pengaturan Tampilan admin.

## Media beranda
Admin → Video & Music: atur judul, video selebar konten, dan satu foto banner. Video dan foto dapat ditampilkan secara terpisah. Pilih 4:5 untuk poster atau 16:9 untuk thumbnail, unggah gambar, aktifkan foto, lalu simpan. Mengganti rasio menggunakan foto yang sama.

Video premium dengan Putar Otomatis aktif mencoba diputar dengan suara saat terlihat. Jika browser membatasi suara otomatis, video mencoba berjalan bisu hingga ada interaksi pengguna, tanpa tombol aktivasi di tengah. Kontrol bawaan video menyediakan suara dan jeda.

## Admin media
Pengaturan beranda dikelompokkan menjadi Video, Foto Banner, dan Musik. Upload foto, rasio, dan status tampil disimpan langsung. Foto yang telah tersimpan sebelum pembaruan dengan status awal nonaktif ditampilkan kembali. Admin dapat menyembunyikannya tanpa menghapus file.

Menu Management di dashboard admin membuka editor /admin/member#management untuk admin dengan akses Member. Klik Tambah pengurus, isi nama, jabatan, pilih foto, lalu Simpan management. Editor memakai daftar yang sama dengan halaman publik dan dapat menambah pengurus setelah posisi kedelapan.

## Pendataan kontak dan laporan event
Pada Admin Data Event, tiap event dapat menampilkan atau menyembunyikan nomor HP team, Nick + ID, Drop Zone, dan logo. Logo yang aktif dapat diwajibkan atau dijadikan opsional. Pengaturan event lama tetap mewajibkan logo dan tidak meminta nomor HP. Kolom Excel serta laporan cetak/PDF mengikuti pengaturan event saat diekspor, termasuk data team lama. Nomor HP hanya muncul pada admin, laporan admin, tautan edit pribadi, dan pesan WhatsApp yang dipilih peserta. Setelah mendaftar, peserta dapat bergabung dengan link grup lalu membuka pesan WhatsApp yang sudah terisi untuk memilih grup dan mengirimnya sendiri. WhatsApp memerlukan tindakan peserta untuk mengirim pesan.

### Pembayaran member dan alokasi periode (v397)

- Pembayaran member mengharuskan peserta memilih team, tier C/S, dan durasi paket sebelum tombol pembayaran aktif. Nama pembayar dan nomor WhatsApp tidak diinput ulang; sistem memakai nama team serta nomor WhatsApp yang tersimpan pada data member.
- Di Admin → Member → Pengaturan Member, QRIS Panboy dan iPaymu dapat ditampilkan atau disembunyikan secara terpisah. QRIS tampil pertama secara bawaan. iPaymu hanya tampil bila aktif dan kredensial penyedia sudah tersedia. API pembayaran juga menolak metode yang dimatikan.
- Di Admin → Keuangan → Tambah Periode, potongan per team dapat dipilih Rp10.000 (Tier C), Rp100.000 (Tier S), atau nominal khusus Rp1–Rp100.000. Ringkasan alokasi dan catatan periode mengikuti nominal yang dipilih. Team yang tidak aktif atau sudah dialokasikan pada bulan yang sama ditolak sebelum periode dibuat.

### Pemilihan event pada pendataan team (v398)

Form Data Team & Player sekarang selalu membuka pilihan nama event dalam keadaan kosong. Peserta harus memilih event terlebih dahulu sebelum nama team dapat diisi atau data dikirim. Parameter `?event=` pada tautan pendaftaran baru tidak lagi memilih event secara otomatis. Tautan edit yang valid tetap memulihkan event dan data team asal setelah tokennya diverifikasi.

### Pengajuan event komunitas dan tampilan (v402)

- Pengunjung dapat mengirim informasi event serta poster JPG/PNG/WebP maksimal 10 MB dari `/ajukan-event`. Pengajuan tersimpan di tabel D1 `event_submissions` dengan status `PENDING`; poster tersimpan di R2. Maksimal tiga pengajuan per nomor WhatsApp per jam.
- Admin dengan izin Event meninjau pengajuan di `/admin/pengajuan-event`. Persetujuan menerbitkan event kategori Community Event ke tabel `events`; penolakan menyimpan alasan tanpa menerbitkan event. Keduanya dicatat di audit log.
- Tabel `event_submissions` dibuat otomatis oleh `lib/event-submissions.ts` saat pertama dipakai, tanpa migrasi data lama. Kolom mencakup data event, poster, status, ID event terbit, tanggal dan identitas pemeriksa, serta alasan penolakan.
- Baris keuangan berstatus `CANCELLED` tidak tampil di daftar admin, sementara status pembatalan dan audit tetap tersimpan. Navigasi publik memakai ikon emas seragam, dan keterangan kartu event dipadatkan.
- Verifikasi: `npm test` membangun aplikasi dan menjalankan pengujian member serta pengajuan event.
