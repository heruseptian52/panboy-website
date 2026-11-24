# Alur repository Panboy Community

Source aplikasi pada branch ini berasal dari Sites v411, commit `55dded20709fe822eea27c92b35848776d7f1f02`. GitHub `main` sebelumnya berisi kerangka migrasi Next.js/Supabase. Setelah review dan merge yang disetujui, gunakan GitHub sebagai titik awal untuk perubahan berikutnya.

1. Uji perubahan di branch terpisah dengan `npm test`.
2. Gunakan D1/R2 staging yang terpisah. Pasang secret melalui hosting dan mulai dengan data sintetis.
3. Review perubahan SQL secara terpisah. Kandidat ini tidak membutuhkan migration SQL baru.
4. Sambungkan mekanisme deploy dari GitHub ke lingkungan yang disetujui. Situs aktif belum otomatis mengikuti GitHub.
5. Verifikasi staging, lalu jadwalkan publikasi melalui workflow yang berwenang. Catat commit yang diterapkan di produksi.
