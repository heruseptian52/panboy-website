import { effectiveLayout } from "./master-layout";

export type RenderTeam = {
  id: number;
  slotNumber: number;
  name: string;
  logoUrl: string;
  matches: number;
  wwcd: number;
  kills: number;
  placementPoints: number;
  total: number;
};
export type Layout = {
  concept?: "podium";
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  lockedVariant?: "LEADERBOARD_WIDE_LOCKED" | "LEADERBOARD_VERTICAL_LOCKED";
  followMaster?: boolean;
  columns?: 1 | 2;
  backgroundMode?: "full" | "transparent" | "textOnly" | "green";
  rowStart?: number;
  rowEnd?: number;
  rowGap?: number;
  rankX?: number;
  logoX?: number;
  nameX?: number;
  wwcdX?: number;
  killsX?: number;
  placementX?: number;
  totalX?: number;
  fontSize?: number;
  logoSize?: number;
  textColor?: string;
  accentColor?: string;
  rowColor?: string;
  headerColor?: string;
  showHeader?: boolean;
  headerStyle?: "full" | "short";
  rowStyle?: "solid" | "rankBadge" | "qualifiedRows";
  qualifyTop?: number;
  qualifiedColor?: string;
  qualifiedTextColor?: string;
  normalRankColor?: string;
  alternateRowColor?: string;
  totalColor?: string;
};
export const defaults: Required<Omit<Layout, "concept" | "lockedVariant">> = {
  gradientStart: "#1744c9",
  gradientEnd: "#f3bd28",
  gradientAngle: 135,
  followMaster: true,
  columns: 1,
  backgroundMode: "full",
  rowStart: 24,
  rowEnd: 94,
  rowGap: 0,
  rankX: 7,
  logoX: 12,
  nameX: 17,
  wwcdX: 62,
  killsX: 72,
  placementX: 82,
  totalX: 93,
  fontSize: 50,
  logoSize: 76,
  textColor: "#ffffff",
  accentColor: "#f2c354",
  rowColor: "#080808",
  headerColor: "#211707",
  showHeader: true,
  headerStyle: "full",
  rowStyle: "solid",
  qualifyTop: 5,
  qualifiedColor: "#d92525",
  qualifiedTextColor: "#ffffff",
  normalRankColor: "#087fc4",
  alternateRowColor: "#262626",
  totalColor: "#f2c354",
};
async function image(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
}
async function drawPodium(ctx: CanvasRenderingContext2D, w: number, h: number, teams: RenderTeam[], highlights: Array<{ number: number; map: string; team: string; logoUrl: string; eliminations: number }>, layout: Layout) {
  const sx = w / 1080, sy = h / 1350;
  ctx.save(); ctx.scale(sx, sy);
  const primary = layout.gradientStart || "#1744c9";
  const secondary = layout.gradientEnd || "#f3bd28";
  const angle = ((layout.gradientAngle ?? 135) % 360) * Math.PI / 180;
  const gradient = (x: number, y: number, width: number, height: number) => {
    const cx = x + width / 2, cy = y + height / 2;
    const dx = Math.cos(angle) * width / 2, dy = Math.sin(angle) * height / 2;
    const fill = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    fill.addColorStop(0, primary); fill.addColorStop(1, secondary);
    return fill;
  };
  const box = (x: number, y: number, width: number, height: number, color: string | CanvasGradient) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
  const label = (value: string, x: number, y: number, size: number, color = "#fff", align: CanvasTextAlign = "left") => { ctx.fillStyle = color; ctx.font = `900 ${size}px Arial`; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(value, x, y); };
  const logo = async (url: string, x: number, y: number, size: number) => { if (!url) return; try { fit(ctx, await image(url), x, y, size); } catch {} };
  box(0, 0, 1080, 1350, "#080808"); box(0, 0, 1080, 14, gradient(0, 0, 1080, 14));
  label("PANBOY COMMUNITY", 42, 64, 27, secondary); label("OVERALL STANDINGS", 42, 116, 44);
  box(38, 163, 390, 825, gradient(38, 163, 390, 825)); box(38, 163, 390, 8, secondary);
  const winner = teams[0];
  if (winner) {
    label("01  CHAMPION", 58, 214, 28, "#ffffff");
    await logo(winner.logoUrl, 105, 244, 255);
    const short = winner.name.length > 19 ? winner.name.slice(0, 18) + "…" : winner.name;
    label(short, 233, 548, 32, "#fff", "center");
    label(String(winner.total), 233, 625, 92, "#ffffff", "center");
    label("TOTAL POINTS", 233, 691, 20, "#fff", "center");
    label(`W ${winner.wwcd}    P ${winner.placementPoints}    E ${winner.kills}`, 233, 748, 20, "#ffffff", "center");
  }
  for (const [i, y] of [[1, 800], [2, 895]] as const) {
    const team = teams[i]; if (!team) continue;
    box(50, y, 366, 84, gradient(50, y, 366, 84)); label(String(i + 1).padStart(2, "0"), 68, y + 42, 30, "#ffffff");
    await logo(team.logoUrl, 112, y + 12, 60);
    label(team.name.slice(0, 18), 185, y + 18, 17);
    label(`${team.total} PTS`, 185, y + 43, 21, "#ffffff");
    label(`W ${team.wwcd}   P ${team.placementPoints}   E ${team.kills}`, 185, y + 69, 14, "#fff");
  }
  const remaining = teams.slice(3);
  box(445, 163, 597, 44, gradient(445, 163, 597, 44));
  label("RANK", 461, 185, 17, "#080808"); label("TEAM", 524, 185, 17, "#080808");
  for (const [x, t] of [[855,"W"],[901,"P"],[947,"E"],[1007,"TOTAL"]] as const) label(t, x, 185, 15, "#080808", "center");
  // Stretch the standings to the same baseline as the podium when few teams
  // are present; compress rows naturally for a full 24-team leaderboard.
  const rowH = 778 / Math.max(1, remaining.length);
  for (let i = 0; i < remaining.length; i++) {
    const t = remaining[i], y = 210 + i * rowH;
    const markSize = Math.min(68, Math.max(18, rowH - 12));
    box(445, y, 597, rowH - 3, i % 2 ? "#1a1a1a" : "#27221a");
    label(String(i + 4).padStart(2, "0"), 461, y + rowH / 2, Math.min(22, rowH * .48), secondary);
    await logo(t.logoUrl, 506, y + (rowH - markSize) / 2, markSize);
    label(t.name.length > 20 ? t.name.slice(0, 19) + "…" : t.name, 506 + markSize + 8, y + rowH / 2, Math.min(20, rowH * .43));
    for (const [x, value] of [[855,t.wwcd],[901,t.placementPoints],[947,t.kills],[1007,t.total]] as const) label(String(value), x, y + rowH / 2, Math.min(21, rowH * .46), x === 1007 ? secondary : "#fff", "center");
  }
  box(38, 1005, 1004, 43, gradient(38, 1005, 1004, 43)); label("MATCH RESULTS  ·  WWCD", 54, 1027, 24, "#080808");
  const cols = highlights.length > 12 ? 6 : 4, rows = Math.max(1, Math.ceil(highlights.length / cols));
  const cardW = 1004 / cols - 7, cardH = Math.min(124, 278 / rows - 5);
  for (let i = 0; i < highlights.length; i++) {
    const item = highlights[i], x = 38 + (i % cols) * (1004 / cols), y = 1060 + Math.floor(i / cols) * (cardH + 5);
    box(x, y, cardW, cardH, gradient(x, y, cardW, cardH));
    label(`MATCH ${item.number}`, x + 7, y + 12, Math.min(14, cardH * .24), "#ffffff");
    const logoSize = Math.min(48, cardH - 26);
    await logo(item.logoUrl, x + 6, y + 23, logoSize);
    label(item.team.slice(0, cols === 6 ? 10 : 15), x + logoSize + 12, y + cardH * .53, Math.min(14, cardH * .21));
    label(`${item.eliminations} ELIMS`, x + logoSize + 12, y + cardH * .8, Math.min(13, cardH * .19), "#ffffff");
  }
  ctx.restore();
}
function fit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const r = Math.min(size / img.width, size / img.height),
    w = img.width * r,
    h = img.height * r;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
}
export async function drawLeaderboard(
  canvas: HTMLCanvasElement,
  board: {
    name: string;
    templateUrl: string;
    canvasWidth: number;
    canvasHeight: number;
    layout: Layout;
    masterLayout?: import("./master-layout").MasterLayout;
    matchHighlights?: Array<{ number: number; map: string; team: string; logoUrl: string; eliminations: number }>;
  },
  teams: RenderTeam[],
) {
  const w = board.canvasWidth,
    h = board.canvasHeight,
    scale = Math.min(4, Math.max(2, 6000 / Math.max(w, h))),
    l = { ...defaults, ...effectiveLayout(board.layout, board.masterLayout || {
      rowStart:18,rowEnd:92,rowGap:0,rankX:4.6,logoX:11.5,nameX:14,
      wwcdX:34,killsX:38,placementX:42,totalX:46,fontSize:28,logoSize:76,
    }) },
    ctx = canvas.getContext("2d")!;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  if (l.concept === "podium") {
    await drawPodium(ctx, w, h, teams, board.matchHighlights || [], l);
    return;
  }
  if (l.backgroundMode === "green") {
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0, 0, w, h);
  } else if (l.backgroundMode === "full" && board.templateUrl) {
    try {
      const bg = await image(board.templateUrl);
      ctx.drawImage(bg, 0, 0, w, h);
    } catch {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, w, h);
    }
  } else if (l.backgroundMode === "full") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#090909");
    g.addColorStop(1, "#2b1d08");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const columns = l.columns === 2 ? 2 : 1,
    referenceWide = l.lockedVariant === "LEADERBOARD_WIDE_LOCKED",
    rows = Math.max(1, Math.ceil(teams.length / columns)),
    start = (h * l.rowStart) / 100,
    end = (h * l.rowEnd) / 100,
    gap = l.rowGap || Math.min(72, (end - start) / rows),
    font = Math.max(12, Math.min((w * l.fontSize) / 1920, gap * 0.62)),
    logo = Math.max(16, Math.min((w * l.logoSize) / 1920, gap * 0.78));
  const twoX = (value: number, fallback: number) =>
    value > 0 && value < 50 ? value : fallback;
  ctx.textBaseline = "middle";
  ctx.font = `900 ${font}px Arial`;
  ctx.shadowColor = "rgba(0,0,0,.8)";
  ctx.shadowBlur = l.rowStyle === "rankBadge" ? 0 : Math.max(2, font * 0.16);
  if (l.showHeader) {
    for (let col = 0; col < columns; col++) {
      const base = columns === 2 ? col * 50 : 0,
        pos =
          columns === 2
            ? {
                rank: twoX(l.rankX, 5),
                name: twoX(l.nameX, 13),
                wwcd: twoX(l.wwcdX, 34),
                kills: twoX(l.killsX, 40),
                placement: twoX(l.placementX, 45),
                total: twoX(l.totalX, 49),
              }
            : {
                rank: l.rankX * (l.followMaster ? 2 : 1),
                name: l.nameX * (l.followMaster ? 2 : 1),
                wwcd: l.wwcdX * (l.followMaster ? 2 : 1),
                kills: l.killsX * (l.followMaster ? 2 : 1),
                placement: l.placementX * (l.followMaster ? 2 : 1),
                total: l.totalX * (l.followMaster ? 2 : 1),
              };
      if (l.backgroundMode !== "textOnly") {
        ctx.fillStyle = l.headerColor;
        ctx.fillRect(
          (w * (base + (referenceWide ? 1 : columns === 2 ? 2 : 3.5))) / 100,
          start - gap * 1.08,
          (w * (referenceWide ? 48 : columns === 2 ? 47 : 93)) / 100,
          gap * 0.62,
        );
      }
      ctx.fillStyle = l.accentColor;
      ctx.font = `900 ${font * 0.55}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        referenceWide ? "RANK" : l.headerStyle === "short" ? "POS" : "RANK",
        (w * (base + pos.rank)) / 100,
        start - gap * 0.77,
      );
      ctx.textAlign = "left";
      ctx.fillText("TEAM", (w * (base + pos.name)) / 100, start - gap * 0.77);
      ctx.textAlign = "center";
      const headers =
        referenceWide
          ? ([[pos.wwcd, "WWCD"], [pos.kills, "PLACE PTS"], [pos.placement, "ELIMS"], [pos.total, "TOTAL"]] as [number, string][])
          : l.headerStyle === "short"
          ? ([
              [pos.wwcd, "W"],
              [pos.kills, "P"],
              [pos.placement, "E"],
              [pos.total, "T"],
            ] as [number, string][])
          : ([
              [pos.wwcd, "WWCD"],
              [pos.kills, "KILL"],
              [pos.placement, "POIN"],
              [pos.total, "TOTAL"],
            ] as [number, string][]);
      for (const [x, t] of headers)
        ctx.fillText(t, (w * (base + x)) / 100, start - gap * 0.77);
      ctx.textAlign = "left";
    }
  }
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i],
      col = columns === 2 ? Math.floor(i / rows) : 0,
      row = columns === 2 ? i % rows : i,
      base = columns === 2 ? col * 50 : 0,
      pos =
        columns === 2
          ? {
              rank: twoX(l.rankX, 5),
              logo: twoX(l.logoX, 10),
              name: twoX(l.nameX, 13),
              wwcd: twoX(l.wwcdX, 34),
              kills: twoX(l.killsX, 40),
              placement: twoX(l.placementX, 45),
              total: twoX(l.totalX, 49),
            }
          : {
              rank: l.rankX * (l.followMaster ? 2 : 1),
              logo: l.logoX * (l.followMaster ? 2 : 1),
              name: l.nameX * (l.followMaster ? 2 : 1),
              wwcd: l.wwcdX * (l.followMaster ? 2 : 1),
              kills: l.killsX * (l.followMaster ? 2 : 1),
              placement: l.placementX * (l.followMaster ? 2 : 1),
              total: l.totalX * (l.followMaster ? 2 : 1),
            },
      y = start + row * gap;
    const qualified = i < Math.max(0, l.qualifyTop),
      normalRow = row % 2 ? l.alternateRowColor : l.rowColor;
    if (l.backgroundMode !== "textOnly") {
      ctx.fillStyle =
        l.rowStyle === "qualifiedRows" && qualified
          ? l.qualifiedColor
          : normalRow;
      ctx.fillRect(
        (w * (base + (referenceWide ? 1 : columns === 2 ? 2 : 3.5))) / 100,
        y - gap * 0.42,
        (w * (referenceWide ? 48 : columns === 2 ? 47 : 93)) / 100,
        gap * 0.84,
      );
      if (referenceWide) {
        ctx.strokeStyle = "#9b6a32";
        ctx.lineWidth = Math.max(1, w / 900);
        ctx.strokeRect(
          (w * (base + 1)) / 100,
          y - gap * 0.42,
          (w * 48) / 100,
          gap * 0.84,
        );
      }
      if (l.rowStyle === "rankBadge" && !referenceWide) {
        ctx.fillStyle = qualified ? l.qualifiedColor : l.normalRankColor;
        ctx.fillRect(
          (w * (base + (columns === 2 ? 2 : 3.5))) / 100,
          y - gap * 0.42,
          (w * (columns === 2 ? 7.5 : 8)) / 100,
          gap * 0.84,
        );
      }
    }
    ctx.fillStyle =
      qualified && l.rowStyle !== "solid"
        ? l.qualifiedTextColor
        : i < 3
          ? l.accentColor
          : l.textColor;
    ctx.font = `950 ${font}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      referenceWide ? `#${i + 1}` : String(i + 1).padStart(2, "0"),
      (w * (base + pos.rank)) / 100,
      y,
    );
    if (t.logoUrl)
      try {
        fit(
          ctx,
          await image(t.logoUrl),
          (w * (base + pos.logo)) / 100 - logo / 2,
          y - logo / 2,
          logo,
        );
      } catch {}
    ctx.fillStyle = l.textColor;
    ctx.font = `900 ${font}px Arial`;
    ctx.textAlign = "left";
    const max = (w * (pos.wwcd - pos.name - 3)) / 100;
    let fs = font;
    while (ctx.measureText(t.name).width > max && fs > 12) {
      fs--;
      ctx.font = `900 ${fs}px Arial`;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect((w * (base + pos.name)) / 100, y - gap * 0.42, Math.max(1, max), gap * 0.84);
    ctx.clip();
    ctx.fillText(t.name, (w * (base + pos.name)) / 100, y);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.font = `900 ${font}px Arial`;
    ctx.fillText(String(t.wwcd), (w * (base + pos.wwcd)) / 100, y);
    if (l.headerStyle === "short") {
      ctx.fillText(
        String(t.placementPoints),
        (w * (base + pos.kills)) / 100,
        y,
      );
      ctx.fillText(String(t.kills), (w * (base + pos.placement)) / 100, y);
    } else {
      ctx.fillText(String(t.kills), (w * (base + pos.kills)) / 100, y);
      ctx.fillText(
        String(t.placementPoints),
        (w * (base + pos.placement)) / 100,
        y,
      );
    }
    ctx.fillStyle = l.totalColor;
    ctx.fillText(String(t.total), (w * (base + pos.total)) / 100, y);
    ctx.textAlign = "left";
  }
  ctx.shadowBlur = 0;
}
export function downloadCanvas(
  canvas: HTMLCanvasElement,
  type: "png" | "jpg",
  name: string,
) {
  const mime = type === "png" ? "image/png" : "image/jpeg",
    a = document.createElement("a");
  a.download = `${name}.${type}`;
  a.href = canvas.toDataURL(mime, type === "jpg" ? 0.96 : undefined);
  a.click();
}
export function downloadPdf(canvas: HTMLCanvasElement, name: string) {
  const url = canvas.toDataURL("image/jpeg", 0.96),
    raw = atob(url.split(",")[1]),
    img = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) img[i] = raw.charCodeAt(i);
  const w = canvas.width,
    h = canvas.height,
    parts: string[] = ["%PDF-1.4\n"],
    offsets = [0];
  function obj(n: number, s: string) {
    offsets[n] = parts.join("").length;
    parts.push(`${n} 0 obj\n${s}\nendobj\n`);
  }
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = parts.join("").length;
  parts.push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`,
  );
  const head = new TextEncoder().encode(parts.join("")),
    tailText = `\nendstream\nendobj\n5 0 obj\n<< /Length ${`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`.length} >>\nstream\nq ${w} 0 0 ${h} 0 0 cm /Im0 Do Q\nendstream\nendobj\n`,
    off5 = head.length + img.length + "\nendstream\nendobj\n".length;
  offsets[5] = off5;
  const xref = off5 + tailText.length,
    trail = `xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => String(offsets[n]).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    blob = new Blob([head, img, new TextEncoder().encode(tailText + trail)], {
      type: "application/pdf",
    }),
    a = document.createElement("a");
  a.download = `${name}.pdf`;
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
