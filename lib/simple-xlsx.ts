import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type SlotSheetRow = { slot: number; name: string; shortName: string };

export type FinanceSheet = { name: string; headers: string[]; rows: Array<Array<string | number>>; widths?: number[] };

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function column(index: number) {
  let result = "";
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}

export function createFinanceWorkbook(sheets: FinanceSheet[]) {
  const safeSheets = sheets.slice(0, 20).map((sheet, index) => ({
    ...sheet,
    name: (sheet.name || `SHEET ${index + 1}`).replace(/[\\/*?:\[\]]/g, " ").slice(0, 31),
  }));
  const overrides = safeSheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const relationships = safeSheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const workbookSheets = safeSheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
  };
  safeSheets.forEach((sheet, index) => {
    const allRows = [sheet.headers, ...sheet.rows];
    const rows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => { const ref = `${column(colIndex)}${rowIndex + 1}`; return typeof value === "number" ? `<c r="${ref}"><v>${value}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`; }).join("")}</row>`).join("");
    const widths = (sheet.widths || sheet.headers.map((h) => Math.min(36, Math.max(12, h.length + 4)))).map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("");
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>${widths}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${column(sheet.headers.length - 1)}${Math.max(1, allRows.length)}"/></worksheet>`);
  });
  return new Blob([zipSync(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function createSlotWorkbook(rows: SlotSheetRow[]) {
  const values: Array<Array<string | number>> = [
    ["SLOT", "NAMA TEAM", "SHORT NAME"],
    ...rows.map((row) => [row.slot, row.name, row.shortName]),
  ];
  const sheetRows = values
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, colIndex) => {
            const ref = `${column(colIndex)}${rowIndex + 1}`;
            return typeof value === "number"
              ? `<c r="${ref}"><v>${value}</v></c>`
              : `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="TEAM" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="10" customWidth="1"/><col min="2" max="2" width="32" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  };
  return new Blob([zipSync(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function xmlValues(xml: string, shared: string[] = []) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Struktur Excel tidak valid.");
  return [...doc.querySelectorAll("row")].map((row) => {
    const values: string[] = [];
    row.querySelectorAll("c").forEach((cell) => {
      const ref = cell.getAttribute("r") || "A1";
      const letters = ref.match(/[A-Z]+/)?.[0] || "A";
      let index = 0;
      for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
      const raw = cell.querySelector("is t")?.textContent ?? cell.querySelector("v")?.textContent ?? "";
      values[index - 1] = cell.getAttribute("t") === "s" ? shared[Number(raw)] || "" : raw;
    });
    return values;
  });
}

export async function readSlotWorkbook(file: File): Promise<SlotSheetRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "xlsx" && extension !== "xls")
    throw new Error("Gunakan file .xlsx atau .xls.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let table: string[][];
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const zip = unzipSync(bytes);
    const shared = zip["xl/sharedStrings.xml"]
      ? [...new DOMParser().parseFromString(strFromU8(zip["xl/sharedStrings.xml"]), "application/xml").querySelectorAll("si")].map((x) => x.textContent || "")
      : [];
    const sheet = zip["xl/worksheets/sheet1.xml"];
    if (!sheet) throw new Error("Worksheet pertama tidak ditemukan.");
    table = xmlValues(strFromU8(sheet), shared);
  } else {
    const text = new TextDecoder().decode(bytes);
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror"))
      throw new Error("Format .xls lama ini tidak didukung. Simpan ulang sebagai .xlsx.");
    table = [...doc.querySelectorAll("Row, row")].map((row) =>
      [...row.querySelectorAll("Cell Data, cell data")].map((cell) => cell.textContent || ""),
    );
  }
  const header = (table[0] || []).map((value) => value.trim().toUpperCase());
  const slotIndex = header.indexOf("SLOT"), nameIndex = header.indexOf("NAMA TEAM"), shortIndex = header.indexOf("SHORT NAME");
  if (slotIndex < 0 || nameIndex < 0 || shortIndex < 0)
    throw new Error("Kolom wajib harus: SLOT, NAMA TEAM, SHORT NAME.");
  return table.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
    slot: Number(row[slotIndex]),
    name: String(row[nameIndex] || "").trim(),
    shortName: String(row[shortIndex] || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
  }));
}

export function downloadWorkbook(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
