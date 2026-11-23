# Integrasi Download Excel — Data Player Event

Modul: `lib/roster-excel.ts`

## Format yang disepakati
- Satu team = satu baris. Team berikutnya langsung di bawah.
- Hanya **satu sheet** bernama Data Player; tidak dibuat sheet atau halaman terpisah per team.
- Kolom pertama selalu **Nama Team**.
- Kolom lain mengikuti centang **pengaturan event admin yang tersimpan**.
- Jika `includeNickname=false`, semua kolom Nickname Player tidak dibuat. Sama untuk ID, HP, Drop Zone, dan Logo.
- Jumlah kolom player mengikuti `maxPlayers` pada pengaturan event (maksimum aman modul ini 20; silakan selaraskan dengan validasi sistem live).
- Semua peserta dari event yang dipilih masuk dalam urutan yang diberikan oleh sistem. Ambil **seluruh halaman data** dari database sebelum export; jangan hanya hasil paginasi layar.
- Cetak A4 landscape, fit-to-width=1 dan fit-to-height=1 (untuk banyak tim teks cetak mengecil).

## Cara memanggil dari tombol Admin → Data Player Event → DOWNLOAD EXCEL
```tsx
"use client";

import { downloadRosterExcel, type TeamData, type RosterExportSettings } from "@/lib/roster-excel";

// Di handler tombol yang sudah ada (setelah data event dipilih dan dimuat):
async function onDownload() {
  // Wajib: cek autentikasi admin dan scope event DI SERVER pada endpoint pengambil data.
  // Jangan pakai data player dari event lain.
  const eventName = selectedEvent.name;
  const teams: TeamData[] = registeredTeamsForSelectedEvent;
  const settings: RosterExportSettings = {
    includeNickname: savedEventSettings.requireNickname,
    includePlayerId: savedEventSettings.requirePlayerId,
    includeTeamPhone: savedEventSettings.requireTeamPhone,
    includeDropZone: savedEventSettings.requireDropZone,
    includeTeamLogo: savedEventSettings.requireLogo,
    maxPlayers: savedEventSettings.maxPlayers,
  };
  await downloadRosterExcel(eventName, teams, settings);
}
```

**Catatan:** `requireNickname`, `requirePlayerId`, dll. di atas contoh nama field; sesuaikan dengan field asli. Untuk checkbox data yang memiliki kebalikan logika seperti "Nick + ID player" harus dipetakan dengan benar. Logo diekspor sebagai teks URL, bukan gambar tertanam.

```tsx
<button onClick={onDownload}>DOWNLOAD EXCEL</button>
```

## Keamanan
- Validasi otorisasi admin & event id pada endpoint SERVER (bukan cuma tombol yang disembunyikan).
- Jangan mempublikasikan API yang mengembalikan roster tanpa login.
- File dihasilkan di browser dari data yang sudah berhak diakses admin.
- Nilai pengguna yang diawali operator formula dibersihkan agar spreadsheet tidak mengeksekusi formula.
- Nomor HP dan ID disimpan sebagai teks; angka panjang dan awalan nol tidak hilang.
- Tidak ada file `.env` atau credential yang diperlukan.
- Implementasi ini ada pada repo **migrasi awal**. Belum terpasang ke halaman admin website live karena source halaman tersebut tidak tersedia di repo.

## Pengujian yang wajib dilakukan di staging
1. Centang nickname ON dan ID OFF → hanya nickname muncul.
2. Centang nickname OFF dan ID ON → hanya ID muncul.
3. Nonaktifkan HP/Drop Zone/logo → kolom hilang.
4. Unduh event A dan B → tidak boleh tercampur.
5. 80 tim → 80 baris data, satu sheet, print area satu halaman.
6. Nomor telepon berawalan 0, player ID >15 digit, teks yang diawali = atau +.
7. Pastikan tombol hanya admin dan data API menolak akun non-admin.
8. Jalankan `npm install`, `npm run typecheck` dan `npm run build` sebelum merge.
