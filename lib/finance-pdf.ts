type Row = Array<string | number>;
export type ReportSection = { title: string; columns: string[]; rows: Row[]; widths: number[] };

const ascii = (value: unknown) => String(value ?? "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\x7e]/g, "-");
const esc = (value: unknown) => ascii(value).replace(/[\\()]/g, "\\$&");
const rp = (value: number) => `Rp${Number(value || 0).toLocaleString("id-ID")}`;
const maxLine = (width: number, size: number) => Math.max(1, Math.floor((width - 16) / (size * .55)));
function cellLines(value: unknown, width: number, size: number, limit = 2) {
  const remaining = ascii(value).trim();
  const max = maxLine(width, size);
  if (!remaining) return [""];
  const lines: string[] = [];
  let rest = remaining;
  while (rest && lines.length < limit) {
    if (rest.length <= max) { lines.push(rest); rest = ""; break; }
    const slice = rest.slice(0, max + 1);
    const boundary = slice.lastIndexOf(" ");
    const take = boundary > max / 2 ? boundary : max;
    lines.push(rest.slice(0, take).trim());
    rest = rest.slice(take).trim();
  }
  if (rest) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, max - 3))}...`;
  return lines;
}

export function createFinancePdf(title: string, summary: Array<[string, number]>, sections: ReportSection[]) {
  const pages: string[] = [];
  let commands: string[] = [], y = 0, pageNumber = 0;
  const text = (x: number, top: number, value: unknown, size = 9, font = "F1", color = ".94 .94 .94") => {
    commands.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${top.toFixed(2)} Tm (${esc(value)}) Tj ET`);
  };
  const rect = (x: number, bottom: number, width: number, height: number, fill: string) =>
    commands.push(`${fill} rg ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  const rule = (top: number) => commands.push(`.78 .74 .65 RG .45 w 38 ${top.toFixed(2)} m 557 ${top.toFixed(2)} l S`);
  const newPage = () => {
    if (commands.length) pages.push(commands.join("\n"));
    pageNumber++;
    commands = ["1 1 1 rg 0 0 595 842 re f", ".65 .49 .12 RG 1 w 38 808 m 557 808 l S"];
    text(38, 819, "PANBOY COMMUNITY  /  LAPORAN KEUANGAN", 11, "F2", ".43 .31 .08");
    text(38, 25, `Dibuat ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium" }).format(new Date())}  |  Halaman ${pageNumber}`, 9, "F1", ".28 .28 .28");
    y = 780;
  };
  const ensure = (height: number) => { if (y - height < 52) newPage(); };
  newPage();
  text(38, y, cellLines(title.toUpperCase(), 519, 17, 1)[0], 17, "F2", ".12 .12 .12"); y -= 27;
  text(38, y, "Rincian kas, iuran member, sponsor, alokasi, dan pengeluaran.", 10, "F1", ".3 .3 .3"); y -= 24;
  for (const [label, amount] of summary) {
    ensure(20);
    rect(38, y - 8, 519, 20, ".94 .93 .89");
    text(46, y - 2, cellLines(label, 310, 9, 1)[0], 9, "F1", ".16 .16 .16");
    const amountLabel = rp(amount);
    text(549 - amountLabel.length * 9 * .55, y - 2, amountLabel, 9, "F2", ".3 .22 .06");
    y -= 22;
  }
  y -= 12; rule(y + 5);

  for (const section of sections) {
    const total = section.widths.reduce((a, b) => a + b, 0) || 1;
    const widths = section.columns.map((_, index) => (section.widths[index] || 50) * 519 / total);
    const numericColumns = section.columns.map((_, index) => section.rows.some(row => typeof row[index] === "number"));
    const drawHeading = (continued: boolean) => {
      y -= 16;
      text(38, y, `${section.title.toUpperCase()}${continued ? "  (LANJUTAN)" : ""}`, 12, "F2", ".37 .26 .05");
      y -= 13;
      rect(38, y - 23, 519, 26, ".9 .85 .71");
      let x = 38;
      section.columns.forEach((label, index) => {
        const lines = cellLines(label.toUpperCase(), widths[index], 8.5, 2);
        lines.forEach((entry, n) => {
          const offset = numericColumns[index] ? Math.max(8, widths[index] - 8 - entry.length * 8.5 * .56) : 8;
          text(x + offset, y - 7 - n * 10, entry, 8.5, "F2", ".14 .12 .08");
        });
        x += widths[index];
      });
      y -= 27;
    };
    ensure(78);
    drawHeading(false);
    if (!section.rows.length) {
      ensure(27);
      text(44, y - 11, "Belum ada transaksi.", 9, "F1", ".3 .3 .3");
      y -= 28;
      continue;
    }
    section.rows.forEach((row, rowIndex) => {
      const cells = section.columns.map((_, index) => {
        const value = row[index];
        return cellLines(typeof value === "number" ? rp(value) : value, widths[index], 9.2);
      });
      const height = Math.max(28, Math.max(...cells.map(lines => lines.length)) * 12 + 10);
      if (y - height < 52) { newPage(); drawHeading(true); }
      if (rowIndex % 2 === 0) rect(38, y - height, 519, height, ".965 .96 .94");
      let x = 38;
      cells.forEach((lines, index) => {
        const value = row[index];
        lines.forEach((entry, n) => {
          const offset = typeof value === "number" ? Math.max(8, widths[index] - 8 - entry.length * 9.2 * .55) : 8;
          text(x + offset, y - 13 - n * 12, entry, 9.2, "F1", ".11 .11 .11");
        });
        x += widths[index];
      });
      y -= height;
      rule(y);
    });
    y -= 9;
  }
  pages.push(commands.join("\n"));

  const count = pages.length, objects: string[] = [], pageRefs = pages.map((_, i) => `${6 + 2 * i} 0 R`).join(" ");
  objects.push("<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pageRefs}] /Count ${count} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  pages.forEach((content, i) => {
    const pageId = 6 + 2 * i, streamId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${streamId} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  let pdf = "%PDF-1.4\n", offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
