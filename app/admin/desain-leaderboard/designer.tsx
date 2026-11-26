"use client";
import {shortLink,copyShortLink} from "../../../lib/short-link-client";
import { uploadForm } from "../../../lib/upload-form";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaults,
  downloadCanvas,
  downloadPdf,
  drawLeaderboard,
  type Layout,
  type RenderTeam,
} from "../../../lib/leaderboard-render";
import { effectiveLayout, isLockedLeaderboard, masterDefaults, preserveLockedLeaderboard, type MasterLayout } from "../../../lib/master-layout";
import type {StyleId} from "../../../lib/leaderboard-style";
import {StyleControls} from "../kelola-template-leaderboard/style-controls";
import { rankLeaderboardTeams } from "../../../lib/leaderboard-ranking";
type Data = {
  board: {
    id: number;
    name: string;
    mode: string;
    templateUrl: string;
    canvasWidth: number;
    canvasHeight: number;
    layout: Layout;
    overlayToken: string;
  };
  teams: Array<{
    id: number;
    slotNumber: number;
    name: string;
    logoUrl: string;
  }>;
  matches: Array<{ id: number; matchNumber: number; mapName: string }>;
  results: Array<{
    matchId: number;
    teamId: number;
    placement: number;
    eliminations: number;
    placementPoints: number;
    totalPoints: number;
  }>;
};

type LayoutPreset = {
  id: string;
  name: string;
  description: string;
  layout: Partial<Layout>;
};

const layoutPresets: LayoutPreset[] = [
  { id: "podium", name: "PODIUM GRADIENT", description: "Juara 1–3 di kiri, klasemen di kanan, hasil match di bawah. Dua warna gradient bebas diatur.", layout: { concept: "podium", followMaster: false, backgroundMode: "full", gradientStart: "#1744c9", gradientEnd: "#f3bd28", gradientAngle: 135 } },
  {
    id: "auto",
    name: "AUTO SESUAI TEMPLATE",
    description: "Menyesuaikan jumlah tim dan bentuk gambar.",
    layout: {},
  },
  {
    id: "portrait-list",
    name: "PORTRAIT FULL LIST",
    description: "Satu kolom panjang untuk Instagram 1080 × 1350.",
    layout: { columns: 1, rowStart: 30, rowEnd: 94, rowGap: 0, fontSize: 42 },
  },
  {
    id: "portrait-split",
    name: "PORTRAIT 2 KOLOM",
    description: "Dua kolom rapi untuk 16–24 tim.",
    layout: { columns: 2, rowStart: 38, rowEnd: 91, rowGap: 0, fontSize: 44 },
  },
  {
    id: "transparent-obs",
    name: "TRANSPARAN + KOTAK",
    description: "Tanpa gambar background, kotak baris tetap terlihat.",
    layout: {
      columns: 1,
      backgroundMode: "transparent",
      rowStart: 24,
      rowEnd: 94,
      rowGap: 0,
      rowColor: "#080808",
      headerColor: "#211707",
    },
  },
  {
    id: "transparent-text",
    name: "TRANSPARAN TEKS SAJA",
    description: "Hanya logo dan tulisan tanpa kotak atau background.",
    layout: {
      columns: 1,
      backgroundMode: "textOnly",
      rowStart: 24,
      rowEnd: 94,
      rowGap: 0,
    },
  },
  {
    id: "pubgm-split",
    name: "PUBGM 2 KOLOM LOLOS",
    description: "POS, TEAM, W, P, E, T seperti contoh; Top 5 diberi merah.",
    layout: {
      // Layout acuan ini sengaja dikunci agar perubahan Master Layout global
      // tidak menggeser komposisi PUBGM dua kolom yang sudah disetujui.
      followMaster: false,
      lockedVariant: "LEADERBOARD_WIDE_LOCKED",
      columns: 2,
      headerStyle: "short",
      rowStyle: "rankBadge",
      qualifyTop: 5,
      rowStart: 15,
      rowEnd: 94,
      rowGap: 0,
      fontSize: 40,
      logoSize: 70,
      rankX: 3.5,
      logoX: 7.2,
      nameX: 11.2,
      wwcdX: 28.7,
      killsX: 35.5,
      placementX: 41,
      totalX: 47.2,
      textColor: "#17120e",
      accentColor: "#fff4de",
      rowColor: "#eee8df",
      alternateRowColor: "#eee8df",
      headerColor: "#9b3d0b",
      qualifiedColor: "#eee8df",
      qualifiedTextColor: "#17120e",
      normalRankColor: "#eee8df",
      totalColor: "#17120e",
    },
  },
  {
    id: "pubgm-dark",
    name: "PUBGM DARK QUALIFIER",
    description: "Satu kolom gelap; seluruh baris tim lolos diberi warna.",
    layout: {
      lockedVariant: "LEADERBOARD_VERTICAL_LOCKED",
      followMaster: false,
      columns: 1,
      headerStyle: "short",
      rowStyle: "qualifiedRows",
      qualifyTop: 5,
      rowStart: 12,
      rowEnd: 94,
      rowGap: 0,
      fontSize: 42,
      logoSize: 76,
      rankX: 5.5,
      logoX: 12,
      nameX: 19,
      wwcdX: 65,
      killsX: 75,
      placementX: 85,
      totalX: 96,
      textColor: "#ffffff",
      accentColor: "#ffffff",
      rowColor: "#4a4a4a",
      alternateRowColor: "#353535",
      headerColor: "#141414",
      qualifiedColor: "#b8171c",
      qualifiedTextColor: "#ffffff",
      normalRankColor: "#565656",
      totalColor: "#ffffff",
    },
  },
];

export default function Designer() {
  const [boards, setBoards] = useState<
      Array<{ id: number; name: string; mode: string; ownerEmail: string }>
    >([]),
    [id, setId] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [scope, setScope] = useState("overall"),
    [layout, setLayout] = useState<Layout>(defaults),
    [master, setMaster] = useState<MasterLayout>(masterDefaults),
    [template, setTemplate] = useState(""),
    [width, setWidth] = useState(1920),
    [height, setHeight] = useState(1080),
    [preset, setPreset] = useState("auto"),
    [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(""),[shortObs,setShortObs]=useState(""),[visibleStyleIds,setVisibleStyleIds]=useState<StyleId[]|null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderVersion = useRef(0);
  useEffect(() => {
    const requested = Number(new URLSearchParams(location.search).get("board"));
    fetch("/api/admin/scoreboards")
      .then((r) => r.json())
      .then((x) => {
        setBoards(x.boards || []);
        if (
          requested &&
          x.boards?.some((b: { id: number }) => b.id === requested)
        )
          setId(requested);
        else if (x.boards?.[0]) setId(x.boards[0].id);
      });
  }, []);
  useEffect(() => {
    if (!id) return;
    const requested =
      new URLSearchParams(location.search).get("match") || "overall";
    Promise.all([
      fetch(`/api/admin/leaderboard-design?id=${id}`).then((r) => r.json()),
      fetch("/api/admin/leaderboard-master").then((r) => r.json()),
    ]).then(([x, masterData]) => {
        if (x.board) {
          const storedTemplate = String(x.board.templateUrl || ""),
            backupTemplate = localStorage.getItem(`leaderboard-template-${id}`),
            safeTemplate = storedTemplate.startsWith("blob:")
              ? backupTemplate || ""
              : storedTemplate;
          setData(x);
          setScope(requested);
          setLayout({ ...defaults, ...x.board.layout });
          setMaster({ ...masterDefaults, ...masterData });
          setTemplate(safeTemplate);
          if (safeTemplate)
            localStorage.setItem(`leaderboard-template-${id}`, safeTemplate);
          setWidth(x.board.canvasWidth);
          setHeight(x.board.canvasHeight);
        }
      });
  }, [id]);
  useEffect(()=>{setShortObs("");if(data?.board.overlayToken){let active=true;void shortLink(location.origin+"/overlay/leaderboard/"+data.board.overlayToken).then(x=>{if(active)setShortObs(x)});return()=>{active=false}}},[data?.board.overlayToken]);
  const renderLayout = useMemo(() => effectiveLayout(layout, master), [layout, master]);
  const layoutLocked = isLockedLeaderboard(layout);
  const ranking = useMemo<RenderTeam[]>(
    () => data ? rankLeaderboardTeams(data.teams, data.results, scope === "overall" ? undefined : Number(scope)) : [],
    [data, scope],
  );
  const matchHighlights = useMemo(() => data?.matches.map(m => {
    const winner = data.results.filter(r => r.matchId === m.id && r.placement === 1).sort((a,b) => b.totalPoints - a.totalPoints)[0];
    const team = data.teams.find(t => t.id === winner?.teamId);
    return team && winner ? { number: m.matchNumber, map: m.mapName, team: team.name, logoUrl: team.logoUrl, eliminations: winner.eliminations } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null) || [], [data]);
  const selectedMatch = data?.matches.find((m) => m.id === Number(scope)),
    exportName = data
      ? `${data.board.name}-${selectedMatch ? `Match-${selectedMatch.matchNumber}` : "Overall"}`
      : "leaderboard";
  useEffect(() => {
    if (!canvas.current || !data) return;
    const version = ++renderVersion.current,
      preview = document.createElement("canvas");
    drawLeaderboard(
      preview,
      {
        name: exportName,
        templateUrl: template,
        canvasWidth: width,
        canvasHeight: height,
        layout: renderLayout,
        masterLayout: master,
        matchHighlights,
      },
      ranking,
    ).then(() => {
      if (version !== renderVersion.current || !canvas.current) return;
      canvas.current.width = preview.width;
      canvas.current.height = preview.height;
      canvas.current.getContext("2d")?.drawImage(preview, 0, 0);
    });
  }, [data, ranking, renderLayout, master, template, width, height, exportName, matchHighlights]);

  function autoFitLayout(imageWidth = width, imageHeight = height): Layout {
    if (isLockedLeaderboard(layout)) return preserveLockedLeaderboard({ ...layout, backgroundMode: "full" }, layout);
    const teamCount = data?.teams.length || ranking.length || 16,
      portrait = imageHeight > imageWidth,
      columns: 1 | 2 = teamCount > (portrait ? 16 : 12) ? 2 : 1;
    return {
      ...layout,
      ...master,
      followMaster: true,
      backgroundMode: "full",
      columns,
    };
  }

  function choosePreset(id: string) {
    setPreset(id);
    const selected = layoutPresets.find((item) => item.id === id);
    if (!selected) return;
    const next: Layout =
      id === "auto"
        ? autoFitLayout()
        : {
            ...layout,
            concept: undefined,
            backgroundMode:
              id === "transparent-obs"
                ? "transparent"
                : id === "transparent-text"
                  ? "textOnly"
                  : "full",
            ...selected.layout,
            ...(id==="podium"?{styleId:"original" as const,design:undefined}:{}),
          };
    setLayout(next);
    if (id === "podium") { setWidth(1080); setHeight(1350); }
    setMessage(`${selected.name} diterapkan. Klik SIMPAN untuk menyimpan.`);
  }
  async function upload(file: File) {
    if (uploading) return;
    setUploading(true);
    setMessage("Template sedang di-upload...");
    const previousTemplate = template;
    const localPreview = URL.createObjectURL(file);
    setTemplate(localPreview);
    const bitmap = await createImageBitmap(file),
      newWidth = bitmap.width,
      newHeight = bitmap.height;
    bitmap.close();
    setWidth(newWidth);
    setHeight(newHeight);
    const autoLayout = autoFitLayout(newWidth, newHeight);
    setPreset("auto");
    setLayout(autoLayout);
    const f = new FormData();
    f.append("poster", file);
    const r = await uploadForm("/api/admin/upload", { method: "POST", body: f }),
      x = await r.json();
    if (r.ok) {
      setTemplate(x.url);
      localStorage.setItem(`leaderboard-template-${id}`, x.url);
      URL.revokeObjectURL(localPreview);
      const saved = await fetch("/api/admin/leaderboard-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          templateUrl: x.url,
          canvasWidth: newWidth,
          canvasHeight: newHeight,
          layout: autoLayout,
        }),
      });
      setMessage(
        saved.ok
          ? `Template ${newWidth} × ${newHeight} otomatis terpasang dan tersimpan.`
          : "Template berhasil di-upload tetapi gagal disimpan. Coba ulangi.",
      );
    } else {
      setTemplate(previousTemplate);
      setMessage(`${x.error}. Template sebelumnya tetap digunakan.`);
    }
    URL.revokeObjectURL(localPreview);
    setUploading(false);
  }
  async function save() {
    if (uploading)
      return setMessage("Tunggu upload template selesai terlebih dahulu.");
    if (template.startsWith("blob:"))
      return setMessage(
        "Link sementara tidak disimpan. Upload ulang template sampai selesai.",
      );
    const r = await fetch("/api/admin/leaderboard-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        templateUrl: template,
        canvasWidth: width,
        canvasHeight: height,
        layout: preserveLockedLeaderboard(layout, layout),
      }),
    });
    setMessage(
      r.ok
        ? "Template dan posisi berhasil disimpan."
        : "Gagal menyimpan template.",
    );
  }
  async function saveMaster() {
    const r = await fetch("/api/admin/leaderboard-master", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(master),
    });
    const x = await r.json();
    setMessage(r.ok ? "Master Layout tersimpan dan langsung dipakai semua template yang mengikuti Master." : x.error || "Gagal menyimpan Master Layout.");
  }
  function resetToMaster() {
    if (layoutLocked) return setMessage("Layout utama ini sudah FINAL LOCKED dan tidak dapat di-reset ke Master.");
    if (!confirm("Reset posisi template ini ke Master Layout? Warna dan background tetap dipertahankan.")) return;
    setLayout({ ...layout, followMaster: true, ...master });
    setMessage("Template kembali mengikuti Master Layout. Klik SIMPAN TEMPLATE & POSISI.");
  }
  function field(key: keyof Layout, label: string, min = 0, max = 100) {
    const follows = layout.followMaster !== false;
    const value = Number((follows ? renderLayout : layout)[key]);
    return (
      <label>
        {label}
        <input type="range" min={min} max={max} step="0.1" disabled={follows || layoutLocked} value={value} onChange={(e) => setLayout({ ...layout, [key]: Number(e.target.value) })} />
        <input
          type="number"
          min={min}
          max={max}
          step="0.1"
          disabled={follows || layoutLocked}
          value={value}
          onChange={(e) => setLayout({ ...layout, [key]: Number(e.target.value) })}
        />
      </label>
    );
  }
  function masterField(key: keyof MasterLayout, label: string, min = 0, max = 100) {
    const change=(value:number)=>{setMaster({...master,[key]:value});setLayout({...layout,followMaster:true,[key]:value})};
    return <label>{label}<input type="range" min={min} max={max} step="0.1" value={master[key]} onChange={(e)=>change(Number(e.target.value))}/><input type="number" min={min} max={max} step="0.1" value={master[key]} onChange={(e)=>change(Number(e.target.value))}/></label>;
  }
  async function exportFile(type: "png" | "jpg" | "pdf") {
    try {
      if (!canvas.current || !data) return;
      const final=document.createElement("canvas");
      await drawLeaderboard(final,{name:exportName,templateUrl:template,canvasWidth:width,canvasHeight:height,layout:renderLayout,masterLayout:master,matchHighlights},ranking);
      if (type === "pdf") downloadPdf(final, exportName);
      else downloadCanvas(final, type, exportName);
    } catch {
      setMessage(
        "Gambar dari link luar memblokir export. Upload langsung template/logo agar bisa diunduh.",
      );
    }
  }
  if (!data)
    return (
      <section className="admin-content">
        <div className="admin-title">
          <div>
            <small>MINI TEMPLATE EDITOR</small>
            <h1>TEMPLATE & EXPORT</h1>
            <p>Pilih leaderboard yang sudah dibuat.</p>
          </div>
        </div>
        <select value={id} onChange={(e) => {const next=Number(e.target.value);setId(next);const url=new URL(location.href);url.searchParams.set("board",String(next));history.replaceState(history.state,"",url)}}>
          <option value="0">Pilih leaderboard</option>
          {boards.map((b) => (
            <option value={b.id} key={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </section>
    );
  const obs = shortObs || `${typeof location !== "undefined" ? location.origin : ""}/overlay/leaderboard/${data.board.overlayToken}`;
  return (
    <section className="admin-content designer-page">
      <div className="admin-title">
        <div>
          <small>AUTO-FIT TEMPLATE EDITOR</small>
          <h1>TEMPLATE & EXPORT HD</h1>
          <p>
            Pilih Overall atau hasil setiap Match. Semuanya otomatis memakai
            template dan posisi yang sama.
          </p>
        </div>
        <a href="/admin/kalkulator-poin">← HITUNG POIN</a>
      </div>
      {message && <p className="form-message">{message}</p>}
      <div className="designer-shell">
        <aside>
          <section className="master-layout-panel">
            <h3>MASTER LAYOUT LEADERBOARD</h3>
            <p className="master-layout-note">Geser slider untuk mengubah posisi dan ukuran langsung pada preview.</p>
            <div className="position-grid master-position-grid">
              {masterField("rowStart", "Mulai Baris Y")}
              {masterField("rowEnd", "Akhir Baris Y")}
              {masterField("rowGap", "Jarak Baris", 0, 200)}
              {masterField("rankX", "Rank X")}
              {masterField("logoX", "Logo X")}
              {masterField("nameX", "Nama X")}
              {masterField("wwcdX", "W / WWCD X")}
              {masterField("killsX", "Poin (P) X")}
              {masterField("placementX", "Elims (E) X")}
              {masterField("totalX", "Total X")}
              {masterField("fontSize", "Font Size", 10, 80)}
              {masterField("logoSize", "Logo Size", 15, 100)}
            </div>
            <button type="button" className="outline-action" onClick={saveMaster}>SIMPAN MASTER LAYOUT</button>
          </section>
          <label>
            Pilih leaderboard
            <select value={id} onChange={(e) => {const next=Number(e.target.value);setId(next);const url=new URL(location.href);url.searchParams.set("board",String(next));history.replaceState(history.state,"",url)}}>
              {boards.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ marginTop: 10 }}>
            Hasil yang ditampilkan
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="overall">OVERALL LEADERBOARD</option>
              {data.matches.map((m) => (
                <option value={m.id} key={m.id}>
                  MATCH {m.matchNumber}
                  {m.mapName ? ` · ${m.mapName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <h3>TEMPLATE</h3>
          <label className="designer-upload">
            UPLOAD PNG / JPG / WEBP
            <input
              type="file"
              disabled={uploading}
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <small>{uploading ? "SEDANG MENGUPLOAD..." : ""}</small>
          </label>
          <input
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              if (e.target.value)
                setLayout({ ...layout, backgroundMode: "full" });
            }}
            placeholder="Atau link template"
          />
          <div className="size-fields">
            <label>
              Lebar
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <label>
              Tinggi
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </label>
          </div>
          <h3>BACKGROUND / OBS</h3>
          <select
            value={layout.backgroundMode}
            onChange={(e) =>
              setLayout({
                ...layout,
                backgroundMode: e.target.value as Layout["backgroundMode"],
              })
            }
          >
            <option value="full">FULL TEMPLATE</option>
            <option value="transparent">TRANSPARAN + KOTAK TEKS</option>
            <option value="textOnly">TRANSPARAN TEKS SAJA</option>
            <option value="green">GREEN SCREEN</option>
          </select>
          <StyleControls onVisibility={setVisibleStyleIds} id={layout.styleId||"original"} design={layout.design} onChange={(styleId,design)=>setLayout(old=>({...old,styleId,design,concept:styleId==="original"?old.concept:undefined,backgroundMode:styleId==="original"?old.backgroundMode:"transparent"}))}/>
          <h3>PILIH KONSEP LAYOUT</h3>
          <div className="layout-preset-grid">
            {layoutPresets.filter(item=>item.id!=="podium"||visibleStyleIds?.includes("original")).map((item) => (
              <button
                type="button"
                className={preset === item.id ? "active" : ""}
                key={item.id}
                onClick={() => choosePreset(item.id)}
              >
                <span className={`preset-thumbnail preset-thumbnail-${item.id}`} aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                <b>{item.name}</b>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
          <h3>POSISI OTOMATIS / MANUAL</h3>
          <label className="follow-master-toggle">
            <input type="checkbox" disabled={layoutLocked} checked={layout.followMaster !== false} onChange={(e)=>setLayout({...layout,followMaster:e.target.checked})}/>
            <span>IKUTI MASTER LAYOUT</span>
          </label>
          <label>
            Susunan Kolom
            <select
              disabled={layoutLocked}
              value={layout.columns}
              onChange={(e) =>
                setLayout({
                  ...layout,
                  columns: Number(e.target.value) as 1 | 2,
                })
              }
            >
              <option value="1">1 KOLOM</option>
              <option value="2">2 KOLOM</option>
            </select>
          </label>
          <div className="layout-options">
            <label>
              Nama Kolom
              <select
                disabled={layoutLocked}
                value={layout.headerStyle}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    headerStyle: e.target.value as Layout["headerStyle"],
                  })
                }
              >
                <option value="full">
                  RANK, TEAM, WWCD, KILL, POIN, TOTAL
                </option>
                <option value="short">POS, TEAM, W, P, E, T</option>
              </select>
            </label>
            <label>
              Tanda Tim Lolos
              <select
                disabled={layoutLocked}
                value={layout.rowStyle}
                onChange={(e) =>
                  setLayout({
                    ...layout,
                    rowStyle: e.target.value as Layout["rowStyle"],
                  })
                }
              >
                <option value="solid">BIASA</option>
                <option value="rankBadge">WARNA PADA NOMOR RANK</option>
                <option value="qualifiedRows">WARNA SELURUH BARIS</option>
              </select>
            </label>
            <label>
              Jumlah Tim Lolos / Berwarna
              <input
                type="number"
                min="0"
                max="32"
                value={layout.qualifyTop}
                onChange={(e) =>
                  setLayout({ ...layout, qualifyTop: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <div className="position-grid">
            {field("rowStart", "Mulai Baris Y")}
            {field("rowEnd", "Akhir Baris Y")}
            {field("rowGap", "Jarak Baris", 0, 200)}
            {field("rankX", "Rank X")}
            {field("logoX", "Logo X")}
            {field("nameX", "Nama X")}
            {field("wwcdX", "W / WWCD X")}
            {field(
              "killsX",
              layout.headerStyle === "short" ? "Poin (P) X" : "Kill X",
            )}
            {field(
              "placementX",
              layout.headerStyle === "short" ? "Elims (E) X" : "Poin X",
            )}
            {field("totalX", "Total X")}
            {field("fontSize", "Font", 10, 80)}
            {field("logoSize", "Logo", 15, 100)}
          </div>
          <div className="color-fields">
            {layout.concept === "podium" && <>
              <label>Gradient warna pertama
                <input type="color" value={layout.gradientStart || "#1744c9"} onChange={(e) => setLayout({ ...layout, gradientStart: e.target.value })} />
              </label>
              <label>Gradient warna kedua
                <input type="color" value={layout.gradientEnd || "#f3bd28"} onChange={(e) => setLayout({ ...layout, gradientEnd: e.target.value })} />
              </label>
              <label>Arah gradient
                <select value={layout.gradientAngle ?? 135} onChange={(e) => setLayout({ ...layout, gradientAngle: Number(e.target.value) })}>
                  <option value="0">Kiri ke kanan</option>
                  <option value="90">Atas ke bawah</option>
                  <option value="135">Diagonal</option>
                  <option value="180">Kanan ke kiri</option>
                </select>
              </label>
            </>}
            <label>
              Warna Teks
              <input
                type="color"
                value={layout.textColor}
                onChange={(e) =>
                  setLayout({ ...layout, textColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Aksen
              <input
                type="color"
                value={layout.accentColor}
                onChange={(e) =>
                  setLayout({ ...layout, accentColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Kotak Baris
              <input
                type="color"
                value={layout.rowColor}
                onChange={(e) =>
                  setLayout({ ...layout, rowColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Kotak Judul
              <input
                type="color"
                value={layout.headerColor}
                onChange={(e) =>
                  setLayout({ ...layout, headerColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Tim Lolos
              <input
                type="color"
                value={layout.qualifiedColor}
                onChange={(e) =>
                  setLayout({ ...layout, qualifiedColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Teks Tim Lolos
              <input
                type="color"
                value={layout.qualifiedTextColor}
                onChange={(e) =>
                  setLayout({ ...layout, qualifiedTextColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Rank Tidak Lolos
              <input
                type="color"
                value={layout.normalRankColor}
                onChange={(e) =>
                  setLayout({ ...layout, normalRankColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Baris Selang-seling
              <input
                type="color"
                value={layout.alternateRowColor}
                onChange={(e) =>
                  setLayout({ ...layout, alternateRowColor: e.target.value })
                }
              />
            </label>
            <label>
              Warna Angka Total
              <input
                type="color"
                value={layout.totalColor}
                onChange={(e) =>
                  setLayout({ ...layout, totalColor: e.target.value })
                }
              />
            </label>
          </div>
          <button className="gold-action" onClick={save} disabled={uploading}>
            SIMPAN TEMPLATE & POSISI
          </button>
          <button
            className="outline-action"
            onClick={resetToMaster}
          >
            RESET KE MASTER LAYOUT
          </button>
        </aside>
        <main>
          <div className="match-export-label">
            <b>
              {selectedMatch
                ? `HASIL MATCH ${selectedMatch.matchNumber}`
                : "OVERALL LEADERBOARD"}
            </b>
            <span>
              {ranking.length} TEAM · {width} × {height}
            </span>
          </div>
          <div
            className="canvas-stage"
            style={{ aspectRatio: `${width}/${height}` }}
          >
            <canvas
              ref={canvas}
              style={
                height >= width
                  ? {
                      width: `min(100%, ${(68 * width) / height}vh)`,
                      height: "auto",
                      maxHeight: "100%",
                    }
                  : { width: "100%", height: "auto", maxHeight: "100%" }
              }
            />
          </div>
          <div className="export-actions">
            <button onClick={() => exportFile("png")}>DOWNLOAD PNG HD</button>
            <button onClick={() => exportFile("jpg")}>DOWNLOAD JPG HD</button>
            <button onClick={() => exportFile("pdf")}>DOWNLOAD PDF</button>
          </div>
          <p className="export-quality-note">
            EXPORT ULTRA HD HINGGA 4× · PNG DIREKOMENDASIKAN AGAR TEKS DAN
            TRANSPARANSI TETAP TAJAM
          </p>
          <section className="obs-box">
            <h3>URL BROWSER SOURCE OBS</h3>
            <input readOnly value={obs} />
            <button onClick={()=>void copyShortLink(obs).then(()=>setMessage("Link OBS tersalin.")).catch(()=>setMessage("Gagal menyalin link OBS."))}>
              COPY URL OBS
            </button>
            <p>
              Ukuran OBS: {width} × {height}. Data diperbarui otomatis tanpa
              reload.
            </p>
          </section>
        </main>
      </div>
    </section>
  );
}
