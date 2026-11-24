# Keamanan Panboy Community

Simpan nilai asli di pengaturan environment hosting. File `.env.example` hanya memuat nama variabel. Jangan commit file `.env`, API key, password, token, cookie, cadangan database, atau URL peserta yang berisi token. Jika credential pernah terungkap, rotasi di layanan asal.

Aplikasi berjalan pada Cloudflare Workers dengan D1 (`DB`) dan R2 (`BUCKET`). Hak akses admin diperiksa di server. Uji perubahan dengan binding staging terpisah, termasuk akses admin dengan peran terbatas dan penolakan permintaan tanpa sesi.

Lihat [laporan audit](docs/AUDIT-2026-11-24.md) untuk status verifikasi. Laporkan temuan keamanan secara pribadi kepada pemilik website melalui kontak resmi.
