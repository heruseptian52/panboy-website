# Audit perubahan WhatsApp Data Player Event — 24 November 2026

## Dasar source

- ZIP yang diunggah berlabel v407 berisi 450 file sumber; checkout Sites v414 berisi 460 file. Ada 58 file dengan isi berbeda, 16 file hanya di v414, dan 6 hanya di ZIP.
- Branch GitHub `codex/panboy-roster-audit` pada PR #8 sebelumnya memiliki tree source yang sama dengan Sites v414. ZIP tidak menggantikan checkout yang lebih baru. Fitur WhatsApp dari ZIP digabung secara selektif.
- Tidak ditemukan file `.env`, `.env.local`, `.env.production`, `.dev.vars`, atau `credentials.json` pada kedua sumber. `.env.example` hanya berisi nama variabel tanpa nilainya. Pemeriksaan pola rahasia yang dikenal pada kode aplikasi tidak memberi temuan. Ini bukan jaminan bahwa seluruh rahasia di luar sumber aman.

## Alur yang diperiksa

- Submit Data Player Event memeriksa hasil POST sebelum pindah ke halaman konfirmasi. Penanda WhatsApp dipasang hanya untuk pendaftaran baru. Data player, logo, dan link edit tidak ditaruh dalam pesan otomatis.
- Halaman konfirmasi mengambil nama team tersimpan melalui API dengan token edit, membersihkan penanda `wa` dari URL, lalu membuka `wa.me` dengan teks nama team. Referrer halaman disetel `no-referrer` karena URL konfirmasi masih memuat token edit.
- Link umum memilih event melalui parameter `event`; API memeriksa apakah pendaftaran umum aktif dan slot tersedia. Undangan pribadi tetap memakai token yang diperiksa server dan nama team terkunci. Link edit tetap memakai token yang diperiksa pada server.
- Ekspor Excel masih memakai generator v414: satu sheet, satu baris per team, kolom sesuai opsi admin, dan page setup A4 landscape. ZIP v407 tidak dipakai untuk menimpa generator yang lebih baru.
- Endpoint admin Data Player Event dan export memeriksa izin `events`; upload admin memerlukan sesi dengan izin terkait. Upload logo publik dibatasi 5 MB, divalidasi terhadap event/link yang aktif, dan disimpan di R2. Login memakai cookie HttpOnly, Secure, SameSite=Lax dan hash PBKDF2.

## Batas dan risiko tersisa

- WhatsApp tidak menyediakan cara melalui link undangan grup untuk memilih grup sekaligus mengirim pesan secara otomatis. Peserta tetap memilih grup dan menekan kirim. Perpindahan otomatis ke aplikasi WhatsApp dapat dibatasi pengaturan perangkat atau browser; tombol manual tersedia.
- Login admin belum memiliki pembatasan percobaan di endpoint aplikasi. Pertimbangkan rate limit pada Cloudflare atau implementasi teruji sebelum membuka akses admin lebih luas.
- Verifikasi Excel dilakukan dengan tes struktur XLSX dan pembaca spreadsheet lokal; Microsoft Excel asli serta klik admin produksi memerlukan pengujian pengguna yang punya sesi admin.
- Audit ini meninjau jalur terkait dan pola keamanan utama; belum merupakan penetration test atau audit seluruh dependensi dan layanan eksternal.
