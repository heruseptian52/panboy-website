# 2026.09.25.2 — Perbaikan upload logo

## 2026.11.24 · Kandidat review GitHub berbasis Sites v411

- Data Player Event memiliki tautan umum yang dapat dinyalakan per event, dengan kuota bersama dan undangan pribadi tetap aktif.
- Excel memakai satu sheet, satu baris per tim, kolom sesuai pengaturan, dan cetak A4 landscape satu halaman.
- Bukti QRIS member dapat dibuka admin yang berwenang. Endpoint status invoice tidak menyertakan nama pembayar atau link bukti.
- Perbarui Next.js, React, React Server Components, dan fflate. Lihat laporan audit untuk temuan yang masih terbuka.
- Tidak ada perubahan skema atau migrasi data untuk kandidat ini. Belum diterapkan ke produksi.

- Mengatasi respons `Payload Too Large` dengan upload bertahap 256 KB dan penyatuan file di server.
- Menerima semua format file logo sampai 5 MB. File yang bukan gambar diunduh sebagai lampiran agar tidak dijalankan oleh browser.
- Menampilkan progres proses dan error yang jelas. Migration: `drizzle/0047_bent_starfox.sql`.
- Verifikasi: build dan struktur migrasi SQLite.

# 2026.09.25 — Pendataan logo event

- Event tertutup dan event yang melewati batas edit disembunyikan dari pilihan publik. Perpanjangan batas waktu ke masa mendatang membuka event kembali.
- Form data player menerima logo gambar maksimal 5 MB dengan progres upload; pengiriman menunggu upload selesai.
- Admin dapat mengisi link folder Drive per event, melihat logo dan status sinkronisasi, serta mencoba ulang sinkronisasi.
- Logo disimpan di R2. Sinkronisasi otomatis ke Drive berlangsung jika OAuth runtime sudah terhubung. Migration: `drizzle/0046_zippy_vargas.sql`.
- Verifikasi: build berhasil. Koneksi Google Drive produksi perlu OAuth dari pemilik akun.

# Changelog

## 2026-09-21

- Menggabungkan permintaan data halaman utama dan dashboard Event Admin ke dalam batch database tunggal untuk memangkas waktu tunggu server.
- Menghilangkan prefetch massal yang membebani server, menunda audio/video sampai interaksi pengguna, hanya memuat satu member hero aktif, dan membuat gambar nonutama dimuat bertahap.
- Mempercepat perpindahan seluruh halaman publik dan admin dengan navigasi tanpa reload penuh, prefetch saat tautan disentuh/diarahkan, dan indikator proses.
- Menambahkan pilihan paket membership lengkap 1–12 bulan, serta tetap mempertahankan pilihan 36 dan 120 bulan.
- Menyamakan validasi harga server untuk Tier C dan Tier S agar paket 7–11 bulan dapat diproses dengan benar.
- Area terdampak: halaman pembayaran member dan validasi pembayaran member.
- Migration database: tidak ada.

## 2026-09-14

- Menambahkan panduan serah-terima developer di `docs/DEVELOPER_HANDOFF.md`.
- Menjelaskan struktur project, database, environment, deployment, dan checklist keamanan.
- Menetapkan format paket source yang aman untuk developer lain.

## Catatan

Setiap perubahan berikutnya wajib menambahkan tanggal, ringkasan perubahan,
file/area yang terdampak, migration database jika ada, dan catatan pengujian.
# 2026.09.22 — Source ownership and handoff

- Menambahkan README lengkap untuk instalasi, database, dependency, build, test, dan deploy.
- Menambahkan `RELEASE_INFO.json` sebagai identitas versi paket.
- Menetapkan prosedur wajib pembuatan ZIP source pada setiap update.
- Tidak ada perubahan atau penghapusan data produksi dan fitur website.
