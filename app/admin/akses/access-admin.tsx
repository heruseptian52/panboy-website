"use client";
import { FormEvent, useEffect, useState } from "react";
type Admin = {
  id: number;
  email: string;
  name: string;
  canEvents: boolean;
  canPartners: boolean;
  canProducts: boolean;
  canOrders: boolean;
  canAppearance: boolean;
  canLeaderboard: boolean;
  canLeaderboardDesign: boolean;
  canLiveObs: boolean;
  canMembers: boolean;
  canFinance: boolean;
  memberDues: boolean; blacklist: boolean; communityProfile: boolean;
  services: boolean; topup: boolean; analytics: boolean; market: boolean;
  active: boolean;
  accessExpiresAt: string | null;
};
const empty = {
  email: "",
  name: "",
  password: "",
  canEvents: false,
  canPartners: false,
  canProducts: false,
  canOrders: false,
  canAppearance: false,
  canLeaderboard: false,
  canLeaderboardDesign: false,
  canLiveObs: false,
  canMembers: false,
  canFinance: false,
  memberDues: false, blacklist: false, communityProfile: false,
  services: false, topup: false, analytics: false, market: false,
  active: true,
  durationDays: "30",
};
export default function AccessAdmin() {
  const [admins, setAdmins] = useState<Admin[]>([]),
    [form, setForm] = useState(empty),
    [edit, setEdit] = useState<number | null>(null),
    [msg, setMsg] = useState("");
  async function load() {
    const r = await fetch("/api/admin/access"),
      x = await r.json();
    if (r.ok) setAdmins(x.admins);
  }
  useEffect(() => {
    load();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/access", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit ? { ...form, id: edit } : form),
      }),
      x = await r.json();
    if (!r.ok) return setMsg(x.error);
    setMsg(
      edit ? "Akun admin berhasil diperbarui." : "Akun admin berhasil dibuat.",
    );
    setForm(empty);
    setEdit(null);
    load();
  }
  async function del(id: number) {
    if (!confirm("Hapus akses admin ini?")) return;
    await fetch(`/api/admin/access?id=${id}`, { method: "DELETE" });
    load();
  }
  function pick(a: Admin) {
    setEdit(a.id);
    setForm({
      email: a.email,
      name: a.name,
      password: "",
      canEvents: Boolean(a.canEvents),
      canPartners: Boolean(a.canPartners),
      canProducts: Boolean(a.canProducts),
      canOrders: Boolean(a.canOrders),
      canAppearance: Boolean(a.canAppearance),
      canLeaderboard: Boolean(a.canLeaderboard),
      canLeaderboardDesign: Boolean(a.canLeaderboardDesign),
      canLiveObs: Boolean(a.canLiveObs),
      canMembers: Boolean(a.canMembers),
      canFinance: Boolean(a.canFinance),
      memberDues: Boolean(a.memberDues), blacklist: Boolean(a.blacklist),
      communityProfile: Boolean(a.communityProfile), services: Boolean(a.services),
      topup: Boolean(a.topup), analytics: Boolean(a.analytics), market: Boolean(a.market),
      active: Boolean(a.active),
      durationDays: "0",
    });
  }
  const permissions = [
    ["canEvents", "Event, Registrasi, Data Player, Team, Turnamen, Scoring & Sampah"],
    ["canLeaderboard", "Hitung Poin"],
    ["canLeaderboardDesign", "Template & Export Leaderboard"],
    ["canLiveObs", "Live OBS"],
    ["canMembers", "Member Panboy Community"],
    ["memberDues", "Iuran Member & Pembayaran"],
    ["blacklist", "Blacklist Player"],
    ["communityProfile", "Community Profile"],
    ["canFinance", "Keuangan & Transparansi"],
    ["canProducts", "Produk Top Up & Jual Akun"],
    ["topup", "Pengaturan Top Up & Supplier"],
    ["services", "Jasa Design & Caster"],
    ["analytics", "Analitik"],
    ["market", "Esports Market"],
    ["canPartners", "Partnership"],
    ["canOrders", "Pesanan"],
    ["canAppearance", "Tampilan Website, Fitur, Video & Music"],
  ] as const;
  return (
    <div className="access-layout">
      <form className="access-form" onSubmit={save}>
        <p>ADMIN UTAMA • AKSES PENUH</p>
        <h1>{edit ? "EDIT ADMIN" : "TAMBAH ADMIN"}</h1>
        <label>
          Nama
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          {edit ? "Password baru (opsional)" : "Password awal"}
          <input
            required={!edit}
            minLength={8}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={
              edit ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"
            }
          />
        </label>
        <label>
          {edit ? "Tambahkan Durasi Akses" : "Durasi Akses"}
          <select
            value={form.durationDays}
            onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
          >
            {edit && <option value="0">TIDAK DIUBAH</option>}
            <option value="1">1 HARI</option>
            <option value="3">3 HARI</option>
            <option value="7">7 HARI</option>
            <option value="14">2 MINGGU</option>
            <option value="30">1 BULAN</option>
            <option value="180">6 BULAN</option>
            <option value="365">1 TAHUN</option>
          </select>
          <small>
            Saat habis, akun terkunci otomatis tetapi seluruh datanya tetap
            tersimpan.
          </small>
        </label>
        <fieldset>
          <legend>PILIH HAK AKSES</legend>
          {permissions.map(([k, l]) => (
            <label className="permission" key={k}>
              <input
                type="checkbox"
                checked={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
              />
              <span>{l}</span>
            </label>
          ))}
          <label className="permission">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span>Akun aktif</span>
          </label>
        </fieldset>
        <p className="access-owner-note">Audit Log dan Akses Admin hanya untuk Admin Utama.</p>
        {msg && <p className="form-message">{msg}</p>}
        <button>{edit ? "SIMPAN PERUBAHAN" : "TAMBAHKAN ADMIN"}</button>
        {edit && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEdit(null);
              setForm(empty);
            }}
          >
            BATAL
          </button>
        )}
      </form>
      <section className="access-list">
        <h2>ADMIN TAMBAHAN</h2>
        <p>
          Admin masuk memakai email dan password sendiri. Akses Hitung Poin
          dapat diberikan tanpa akses event lainnya.
        </p>
        {admins.map((a) => (
          <article key={a.id}>
            <div>
              <small>
                {!a.active
                  ? "NONAKTIF"
                  : a.accessExpiresAt &&
                      new Date(a.accessExpiresAt).getTime() <= Date.now()
                    ? "DURASI HABIS"
                    : "AKTIF"}
              </small>
              <h3>{a.name || a.email}</h3>
              <p>{a.email}</p>
              <p>
                {a.accessExpiresAt
                  ? `Berlaku sampai ${new Date(a.accessExpiresAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`
                  : "Durasi belum diatur"}
              </p>
              <div className="permission-tags">
                {a.canEvents && <span>EVENT</span>}
                {a.canLeaderboard && <span>HITUNG POIN</span>}
                {a.canLeaderboardDesign && <span>TEMPLATE & EXPORT</span>}
                {a.canLiveObs && <span>LIVE OBS</span>}
                {a.canMembers && <span>MEMBER</span>}
                {a.memberDues && <span>IURAN</span>}
                {a.blacklist && <span>BLACKLIST</span>}
                {a.communityProfile && <span>COMMUNITY PROFILE</span>}
                {a.services && <span>JASA & CASTER</span>}
                {a.topup && <span>TOP UP ADMIN</span>}
                {a.analytics && <span>ANALITIK</span>}{a.market && <span>ESPORTS MARKET</span>}
                {a.canFinance && <span>KEUANGAN</span>}
                {a.canProducts && <span>PRODUK</span>}
                {a.canPartners && <span>PARTNER</span>}
                {a.canOrders && <span>PESANAN</span>}
                {a.canAppearance && <span>TAMPILAN</span>}
              </div>
            </div>
            <div>
              <button onClick={() => pick(a)}>EDIT</button>
              <button className="danger" onClick={() => del(a.id)}>
                HAPUS
              </button>
            </div>
          </article>
        ))}
        {!admins.length && <p>Belum ada admin tambahan.</p>}
      </section>
    </div>
  );
}
