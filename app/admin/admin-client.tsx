"use client";
import { uploadForm } from "../../lib/upload-form";
import { FormEvent, useEffect, useState } from "react";
type EventItem = {
  id: number;
  title: string;
  eventDate: string;
  startDate: string;
  endDate: string;
  prizepool: string;
  registrationFee: string;
  imageUrl: string;
  category: string;
  status: string;
  whatsapp: string;
  eventMode: string;
  registrationType: string;
  city: string;
  province: string;
  address: string;
  maxSlots: number;
  paidSlots: number;
  sortOrder: number;
};
const empty = {
  title: "",
  eventDate: "",
  startDate: "",
  endDate: "",
  prizepool: "",
  registrationFee: "",
  imageUrl: "",
  category: "Event Panboy",
  status: "OPEN REGISTRATION",
  whatsapp: "081545910291",
  eventMode: "Online",
  registrationType: "PUBLIC",
  city: "",
  province: "",
  address: "",
  maxSlots: 0,
  sortOrder: 0,
};
const defaultCategories = [
    "Event Panboy",
    "Event Premium",
    "Event Official",
    "Community Event",
    "Event Partner",
  ],
  defaultStatuses = [
    "OPEN REGISTRATION",
    "FREE REGISTRATION",
    "REGISTRATION",
    "COMING SOON",
    "SLOT FULL",
    "SELESAI",
  ],
  defaultModes = ["Online", "Offline"];
export default function AdminClient({
  isOwner = false,
}: {
  isOwner?: boolean;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState(defaultCategories),
    [statuses, setStatuses] = useState(defaultStatuses),
    [modes, setModes] = useState(defaultModes),
    [newCategory, setNewCategory] = useState(""),
    [newStatus, setNewStatus] = useState(""),
    [newMode, setNewMode] = useState("");
  const paymentEligible = ["EVENT PANBOY", "EVENT PREMIUM"].includes(
    form.category.toUpperCase(),
  );
  async function load() {
    const response = await fetch("/api/admin/bootstrap");
    if (response.ok) {
      const data = await response.json();
      setEvents(data.events);
      setCategories(data.options.categories);
      setStatuses(data.options.statuses);
      setModes(data.options.modes);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function change(name: string, value: string | number) {
    setForm((f) => ({ ...f, [name]: value }));
  }
  function rupiah(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits ? `Rp${Number(digits).toLocaleString("id-ID")}` : "";
  }
  function groupEvents(items: EventItem[]) {
    const groups = new Map<string, { label: string; items: EventItem[] }>();
    for (const item of items) {
      const key = (item.startDate || "lainnya").slice(0, 7);
      if (!groups.has(key)) {
        const date = item.startDate
          ? new Date(`${item.startDate}T12:00:00+07:00`)
          : null;
        groups.set(key, {
          label: date
            ? new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              })
                .format(date)
                .toUpperCase()
            : "TANPA BULAN",
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()].sort((a, b) =>
      a.items[0].startDate.localeCompare(b.items[0].startDate),
    );
  }
  async function compressPoster(file: File) {
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Ukuran poster maksimal 10 MB");
    const bitmap = await createImageBitmap(file),
      scale = Math.min(1, 1080 / bitmap.width, 1350 / bitmap.height),
      width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale)),
      canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gagal memproses poster");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Gagal mengompres poster")),
        "image/webp",
        0.86,
      ),
    );
    return new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "") || "poster"}.webp`,
      { type: "image/webp" },
    );
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      setMessage("Mengoptimalkan poster...");
      const optimized = await compressPoster(file),
        before = (file.size / 1024 / 1024).toFixed(1),
        after = (optimized.size / 1024).toFixed(0);
      setMessage(`Poster diperkecil ${before} MB → ${after} KB. Mengunggah...`);
      const data = new FormData();
      data.append("poster", optimized);
      const r = await uploadForm("/api/admin/upload", {
          method: "POST",
          body: data,
        }),
        out = await r.json();
      if (!r.ok) throw new Error(out.error || "Upload gagal");
      change("imageUrl", out.url);
      setMessage(`Poster berhasil diunggah (${after} KB).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("Menyimpan event...");
    const r = await fetch("/api/admin/events", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { ...form, id: editId } : form),
    });
    const out = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMessage(out.error || "Gagal menyimpan");
      return;
    }
    setMessage(
      editId ? "Event berhasil diperbarui." : "Event berhasil ditambahkan.",
    );
    setForm(empty);
    setEditId(null);
    await load();
  }
  function edit(item: EventItem) {
    setEditId(item.id);
    setForm({
      title: item.title,
      eventDate: item.eventDate,
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      prizepool: item.prizepool || "",
      registrationFee: item.registrationFee || "",
      imageUrl: item.imageUrl,
      category: item.category,
      status: item.status,
      whatsapp: item.whatsapp,
      eventMode: item.eventMode || "Online",
      registrationType: item.registrationType || "PUBLIC",
      city: item.city || "",
      province: item.province || "",
      address: item.address || "",
      maxSlots: item.maxSlots || 0,
      sortOrder: item.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(id: number) {
    if (!confirm("Hapus event ini dari website?")) return;
    setBusy(true);
    const r = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) {
      setMessage("Event berhasil dihapus.");
      await load();
    } else setMessage("Gagal menghapus event.");
  }
  async function addOption(
    type: "category" | "status" | "mode",
    value: string,
  ) {
    if (!value.trim()) return;
    const r = await fetch("/api/admin/event-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      }),
      out = await r.json();
    if (!r.ok) {
      setMessage(out.error || "Gagal menambah pilihan");
      return;
    }
    setCategories(out.categories);
    setStatuses(out.statuses);
    setModes(out.modes);
    if (type === "category") {
      setNewCategory("");
      change("category", value.trim());
    } else if (type === "status") {
      setNewStatus("");
      change("status", value.trim().toUpperCase());
    } else {
      setNewMode("");
      change("eventMode", value.trim());
    }
    setMessage("Pilihan baru berhasil ditambahkan.");
  }
  async function deleteOption(
    type: "category" | "status" | "mode",
    value: string,
  ) {
    if (!confirm(`Hapus pilihan ${value}?`)) return;
    const r = await fetch(
        `/api/admin/event-options?type=${type}&value=${encodeURIComponent(value)}`,
        { method: "DELETE" },
      ),
      out = await r.json();
    if (!r.ok) {
      setMessage(out.error || "Gagal menghapus pilihan");
      return;
    }
    setCategories(out.categories);
    setStatuses(out.statuses);
    setModes(out.modes);
    setMessage("Pilihan berhasil dihapus.");
  }
  return (
    <div className="admin-layout">
      <section className="admin-form-card">
        <div className="admin-title">
          <p>DASHBOARD EVENT</p>
          <h1>{editId ? "EDIT EVENT" : "TAMBAH EVENT"}</h1>
          <span>Semua perubahan akan langsung tampil di halaman utama.</span>
        </div>
        <form onSubmit={submit}>
          <label>
            Poster Event
            <input
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <small>
              Otomatis dikompres ke WebP, maksimal 1080 × 1350 px. File awal
              maksimal 10 MB.
            </small>
          </label>
          {form.imageUrl && (
            <div className="upload-preview">
              <img src={form.imageUrl} alt="Preview poster" />
              <span>Poster siap digunakan</span>
            </div>
          )}
          <label>
            Nama Event
            <input
              required
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              placeholder="Contoh: Ultimate Collab Season 7"
            />
          </label>
          <div className="form-row">
            <label>
              Tanggal Mulai
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => change("startDate", e.target.value)}
              />
              <small>Registrasi tutup dan poster hilang pukul 19.00 WIB.</small>
            </label>
            <label>
              Tanggal Selesai
              <input
                type="date"
                required
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => change("endDate", e.target.value)}
              />
              <small>Periode event dibuat otomatis dari kedua tanggal.</small>
            </label>
          </div>
          <div className="form-row">
            <label>
              Prizepool
              <input
                required
                inputMode="numeric"
                value={form.prizepool}
                onChange={(e) => change("prizepool", rupiah(e.target.value))}
                placeholder="Contoh: Rp3.000.000"
              />
            </label>
            {(form.status === "OPEN REGISTRATION" ||
              form.status === "REGISTRATION") && (
              <label>
                Fee Registrasi
                <input
                  required
                  inputMode="numeric"
                  value={form.registrationFee}
                  onChange={(e) =>
                    change("registrationFee", rupiah(e.target.value))
                  }
                  placeholder="Contoh: Rp30.000"
                />
              </label>
            )}
          </div>
          <div className="form-row">
            <label>
              Kategori
              <select
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
              >
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <small>
                Hanya Event Panboy dan Event Premium yang tampil di poster
                melayang.
              </small>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {statuses.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          {isOwner && (
            <div className="event-option-manager">
              <p>PILIHAN KHUSUS ADMIN UTAMA</p>
              <div>
                <label>
                  Tambah Kategori
                  <span>
                    <input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nama kategori baru"
                    />
                    <button
                      type="button"
                      onClick={() => addOption("category", newCategory)}
                    >
                      TAMBAH
                    </button>
                  </span>
                </label>
                <div className="option-tags">
                  {categories
                    .filter((x) => !defaultCategories.includes(x))
                    .map((x) => (
                      <button
                        type="button"
                        key={x}
                        onClick={() => deleteOption("category", x)}
                      >
                        {x} ×
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <label>
                  Tambah Status
                  <span>
                    <input
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      placeholder="Nama status baru"
                    />
                    <button
                      type="button"
                      onClick={() => addOption("status", newStatus)}
                    >
                      TAMBAH
                    </button>
                  </span>
                </label>
                <div className="option-tags">
                  {statuses
                    .filter((x) => !defaultStatuses.includes(x))
                    .map((x) => (
                      <button
                        type="button"
                        key={x}
                        onClick={() => deleteOption("status", x)}
                      >
                        {x} ×
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <label>
                  Tambah Jenis Pelaksanaan
                  <span>
                    <input
                      value={newMode}
                      onChange={(e) => setNewMode(e.target.value)}
                      placeholder="Contoh: Hybrid atau LAN"
                    />
                    <button
                      type="button"
                      onClick={() => addOption("mode", newMode)}
                    >
                      TAMBAH
                    </button>
                  </span>
                </label>
                <div className="option-tags">
                  {modes
                    .filter((x) => !defaultModes.includes(x))
                    .map((x) => (
                      <button
                        type="button"
                        key={x}
                        onClick={() => deleteOption("mode", x)}
                      >
                        {x} ×
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
          <label>
            Jenis Pelaksanaan
            <select
              value={form.eventMode}
              onChange={(e) => change("eventMode", e.target.value)}
            >
              {modes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {form.eventMode === "Offline" && (
            <div className="offline-fields">
              <p>LOKASI EVENT OFFLINE</p>
              <div className="form-row">
                <label>
                  Kota
                  <input
                    required
                    value={form.city}
                    onChange={(e) => change("city", e.target.value)}
                    placeholder="Contoh: Palu"
                  />
                </label>
                <label>
                  Provinsi
                  <input
                    required
                    value={form.province}
                    onChange={(e) => change("province", e.target.value)}
                    placeholder="Contoh: Sulawesi Tengah"
                  />
                </label>
              </div>
              <label>
                Alamat Lengkap
                <textarea
                  required
                  value={form.address}
                  onChange={(e) => change("address", e.target.value)}
                  placeholder="Contoh: Erafone And More, Jl. Yos Sudarso, Palu"
                />
              </label>
            </div>
          )}
          <label>Jenis pendaftaran
            <select value={form.registrationType} onChange={e=>change("registrationType",e.target.value)}><option value="PUBLIC">Terbuka · daftar melalui WhatsApp</option><option value="INTERNAL">Internal · team penyelenggara saja</option></select>
            <small>Event internal tetap tampil, tetapi tidak menerima pendaftaran publik.</small>
          </label>
          <label>
            Nomor WhatsApp Admin
            <input
              required
              value={form.whatsapp}
              onChange={(e) => change("whatsapp", e.target.value)}
              placeholder="Contoh: 081234567890"
            />
          </label>
          <div className="form-row">
            {paymentEligible ? (
              <label>
                Total Slot Registrasi
                <input
                  type="number"
                  min="0"
                  value={form.maxSlots}
                  onChange={(e) => change("maxSlots", Number(e.target.value))}
                />
                <small>
                  Khusus Event Panboy dan Event Premium. Slot berkurang setelah
                  QRIS berhasil.
                </small>
              </label>
            ) : (
              <div className="slot-disabled">
                <b>REGISTRASI VIA WHATSAPP</b>
                <small>
                  Slot dan QRIS otomatis hanya tersedia untuk Event Panboy serta
                  EVENT PREMIUM.
                </small>
              </div>
            )}
            <label>
              Urutan Tampil
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => change("sortOrder", Number(e.target.value))}
              />
            </label>
          </div>
          {message && <p className="form-message">{message}</p>}
          <div className="form-actions">
            <button disabled={busy || !form.imageUrl}>
              {busy
                ? "MEMPROSES..."
                : editId
                  ? "SIMPAN PERUBAHAN"
                  : "TAMBAHKAN EVENT"}
            </button>
            {editId && (
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setEditId(null);
                  setForm(empty);
                }}
              >
                BATAL
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="event-manager">
        <div className="manager-head">
          <div>
            <p>SEMUA EVENT</p>
            <h2>DAFTAR EVENT</h2>
          </div>
          <span>{events.length} EVENT</span>
        </div>
        <div className="manager-list">
          {groupEvents(events).map((group) => (
            <section className="admin-month-group" key={group.label}>
              <div className="admin-month-title">
                <b>{group.label}</b>
                <span>{group.items.length} EVENT</span>
              </div>
              {group.items.map((item) => (
                <article key={item.id}>
                  <img src={item.imageUrl} alt={item.title} />
                  <div>
                    <small>
                      {item.category} • {item.status} •{" "}
                      {item.eventMode || "Online"}
                    </small>
                    <h3>{item.title}</h3>
                    <p>{item.eventDate}</p>
                    <p>
                      Registrasi tutup:{" "}
                      {item.startDate
                        ? `${item.startDate} • 19.00 WIB`
                        : "tanggal mulai belum diatur"}
                    </p>
                    {item.eventMode === "Offline" && (
                      <p>
                        Lokasi: {item.city}, {item.province} — {item.address}
                      </p>
                    )}
                    <p>WA: {item.whatsapp}</p>
                  </div>
                  <div className="manage-actions">
                    <button onClick={() => edit(item)}>EDIT</button>
                    <button
                      className="delete"
                      onClick={() => remove(item.id)}
                      disabled={busy}
                    >
                      HAPUS
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
          {!events.length && <p>Belum ada event.</p>}
        </div>
      </section>
    </div>
  );
}
