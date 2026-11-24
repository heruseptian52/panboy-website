"use client";
import { useEffect, useState } from "react";
const fields = [
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "introEyebrow",
  "introTitle",
  "introText",
  "membershipEyebrow",
  "membershipTitle",
  "membershipIntro",
  "tierCLabel",
  "tierCPrice",
  "tierCPrize",
  "tierCDescription",
  "tierSLabel",
  "tierSPrice",
  "tierSPrize",
  "tierSDescription",
  "benefitEyebrow",
  "benefitTitle",
  "finalEyebrow",
  "finalTitle",
  "finalText",
] as const;
type Key = (typeof fields)[number];
export default function CommunityProfileEditor() {
  const [value, setValue] = useState<Record<string, string>>({}),
    [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/admin/member-settings")
      .then((r) => r.json())
      .then((x) => {
        try {
          setValue(JSON.parse(x.settings?.communityProfileTextJson || "{}"));
        } catch {
          setValue({});
        }
      });
  }, []);
  const set = (k: Key, v: string) => setValue((x) => ({ ...x, [k]: v }));
  async function save() {
    setMsg("Menyimpan...");
    const r = await fetch("/api/admin/member-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityProfileTextJson: JSON.stringify(value) }),
    });
    setMsg(r.ok ? "Community Profile berhasil disimpan." : "Gagal menyimpan.");
  }
  return (
    <section className="community-profile-editor">
      <h1>EDIT COMMUNITY PROFILE</h1>
      <p>
        Ubah teks yang tampil di halaman Community Profile. Kosongkan jika ingin
        memakai teks bawaan.
      </p>
      <div className="community-profile-editor-grid">
        {fields.map((k) => (
          <label key={k}>
            {k.replace(/[A-Z]/g, (m) => ` ${m}`).toUpperCase()}
            <textarea
              value={value[k] || ""}
              onChange={(e) => set(k, e.target.value)}
              rows={
                k.includes("Description") ||
                k.includes("Text") ||
                k.includes("Intro")
                  ? 3
                  : 1
              }
            />
          </label>
        ))}
      </div>
      <button onClick={save}>SIMPAN COMMUNITY PROFILE</button>
      {msg && <p className="form-message">{msg}</p>}
    </section>
  );
}
