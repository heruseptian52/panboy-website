import type { AdminPermissions } from "../../lib/admin-auth";
import type { IconName } from "../panboy-icon";

export type MenuItem = { href: string; label: string; description: string; icon: IconName; alert?: "registrations" | "payments" };
export type MenuGroup = { id: string; label: string; description: string; icon: IconName; items: MenuItem[] };

export function menuGroups(a: AdminPermissions): MenuGroup[] {
  const groups: MenuGroup[] = [
    { id: "event", label: "Event", description: "Publikasi, registrasi, data peserta, dan turnamen.", icon: "event", items: [
      ...(a.events ? [
        { href: "/admin", label: "Kelola Event", description: "Buat dan ubah event yang tampil di website.", icon: "event" },
        { href: "/admin/pengajuan-event", label: "Pengajuan Event", description: "Periksa poster dan setujui atau tolak event kiriman pengunjung.", icon: "registration" },
        { href: "/admin/registrasi", label: "Registrasi", description: "Atur pendaftaran peserta event.", icon: "registration" },
        { href: "/admin/data-event", label: "Data Player Event", description: "Form team, player, drop zone, dan ekspor.", icon: "database" },
        { href: "/admin/turnamen", label: "Turnamen", description: "Kelola penyelenggaraan turnamen.", icon: "tournament" },
        { href: "/admin/kompetisi", label: "Scoring Event", description: "Pengaturan kompetisi dan perhitungan event.", icon: "scoring" },
      ] as MenuItem[] : []),
    ] },
    { id: "team", label: "Team & Player", description: "Database team serta laporan blacklist.", icon: "database", items: [
      ...(a.events ? [{ href: "/admin/database", label: "Database Team & Player", description: "Cari dan kelola data team serta player.", icon: "database" } as MenuItem] : []),
      ...(a.blacklist ? [{ href: "/admin/blacklist", label: "Blacklist Player", description: "Tinjau laporan dan bukti player.", icon: "member" } as MenuItem] : []),
    ] },
    { id: "member", label: "Member", description: "Pendaftaran, profil, iuran, dan pembayaran.", icon: "member", items: [
      ...(a.members ? [
        { href: "/admin/member", label: "Daftar Member", description: "Kelola team member, benefit, dan pengaturan.", icon: "member" },
        { href: "/admin/member/pendaftaran", label: "Pendaftaran Baru", description: "Tinjau calon member yang menunggu keputusan.", icon: "registration", alert: "registrations" },
        { href: "/admin/member/nonaktif", label: "Member Nonaktif", description: "Lihat team yang sudah tidak aktif.", icon: "profile" },
        { href: "/admin/member#management", label: "Management", description: "Atur profil pengurus Panboy.", icon: "management" },
      ] as MenuItem[] : []),
      ...(a.memberDues ? [
        { href: "/admin/member-dues", label: "Iuran Member", description: "Saldo, masa aktif, dan pengingat iuran.", icon: "payment" },
        { href: "/admin/member-dues/pembayaran", label: "Pembayaran Iuran", description: "Verifikasi bukti QRIS dan lihat transaksi.", icon: "payment", alert: "payments" },
        { href: "/admin/member-dues/qris", label: "Pengaturan QRIS", description: "Kelola QRIS pembayaran member.", icon: "payment" },
      ] as MenuItem[] : []),
    ] },
    { id: "tools", label: "Tools Event", description: "Hitung poin, leaderboard, dan live OBS.", icon: "scoring", items: [
      ...(a.leaderboard ? [{ href: "/admin/kalkulator-poin", label: "Hitung Poin", description: "Kelola perhitungan poin pertandingan.", icon: "scoring" } as MenuItem] : []),
      ...(a.isOwner ? [{ href: "/admin/kelola-template-leaderboard", label: "Kelola Template Leaderboard", description: "Visibilitas, urutan, dan default template desain.", icon: "template" } as MenuItem] : []),
      ...(a.leaderboardDesign ? [{ href: "/admin/desain-leaderboard", label: "Template & Export", description: "Desain dan ekspor leaderboard.", icon: "template" } as MenuItem] : []),
      ...(a.liveObs ? [{ href: "/admin/live-leaderboard", label: "Live OBS", description: "Atur tampilan leaderboard saat siaran.", icon: "live" } as MenuItem] : []),
    ] },
    { id: "layanan", label: "Layanan", description: "Jasa desain dan caster.", icon: "media", items: [
      ...(a.services ? [{ href: "/admin/jasa-design", label: "Jasa & Caster", description: "Kelola layanan desain, event, dan caster.", icon: "media" } as MenuItem] : []),
    ] },
    { id: "keuangan", label: "Keuangan", description: "Periode, kas, pemasukan, dan laporan.", icon: "finance", items: [
      ...(a.finance ? [
        { href: "/admin/keuangan", label: "Keuangan Event", description: "Periode, alokasi, sponsor, dan laporan.", icon: "finance" },
        { href: "/admin/keuangan/operasional", label: "Kas Operasional", description: "Pantau dana dan pengeluaran operasional.", icon: "balance" },
      ] as MenuItem[] : []),
    ] },
    { id: "toko", label: "Toko Digital", description: "Top up, produk digital, dan toko.", icon: "shop", items: [
      ...(a.topup ? [
        { href: "/admin/topup", label: "Top Up", description: "Kelola katalog dan harga top up.", icon: "topup" },
        { href: "/admin/topup/sync", label: "Sync Produk", description: "Sinkronkan daftar produk digital.", icon: "sync" },
        { href: "/admin/topup/requirements", label: "Input Digital", description: "Atur kebutuhan data pesanan digital.", icon: "digital" },
      ] as MenuItem[] : []),
      ...(a.products || a.partners || a.orders ? [{ href: "/admin/toko", label: "Kelola Toko", description: "Produk, pesanan, dan partnership toko.", icon: "shop" } as MenuItem] : []),
    ] },
    { id: "pengaturan", label: "Pengaturan", description: "Tampilan, media, akses, dan aktivitas admin.", icon: "settings", items: [
      ...(a.appearance ? [
        { href: "/admin/fitur", label: "Aktif / Nonaktif", description: "Atur menu dan fitur yang ditampilkan.", icon: "settings" },
        { href: "/admin/tampilan", label: "Tampilan", description: "Warna, tulisan, dan tampilan website.", icon: "template" },
        { href: "/admin/media", label: "Video, Foto & Musik", description: "Kelola media beranda.", icon: "media" },
        { href: "/admin/showcase", label: "Panboy Showcase / Manajemen Iklan", description: "Promosi, sponsor, profil pengiklan, dan statistik.", icon: "media" },
      ] as MenuItem[] : []),
      ...(a.communityProfile ? [{ href: "/admin/community-profile", label: "Community Profile", description: "Ubah isi profil komunitas.", icon: "profile" } as MenuItem] : []),
      ...(a.analytics ? [{ href: "/admin/analitik", label: "Analitik", description: "Pantau aktivitas pengunjung.", icon: "analytics" } as MenuItem] : []),
      ...(a.events ? [{ href: "/admin/sampah", label: "Sampah", description: "Lihat data event yang dihapus.", icon: "trash" } as MenuItem] : []),
      ...(a.isOwner ? [
        { href: "/admin/audit", label: "Audit Log", description: "Riwayat perubahan oleh admin.", icon: "audit" },
        { href: "/admin/akses", label: "Akses Admin", description: "Atur akun dan izin admin.", icon: "admin" },
      ] as MenuItem[] : []),
    ] },
  ];
  return groups.filter(group => group.items.length > 0);
}
