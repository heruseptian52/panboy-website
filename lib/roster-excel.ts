/**
 * Excel export for a single event's player registrations.
 *
 * Admin selects which data fields to collect; the export reuses those exact
 * settings. No admin/auth or database implementation is included here.
 * Enforce admin authorization BEFORE loading team/player data for this module.
 */
export type PlayerData = {
  nickname?: string | null;
  playerId?: string | number | null;
};

export type TeamData = {
  id: string;
  teamName: string;
  teamPhone?: string | null;
  dropZone?: string | null;
  logoUrl?: string | null;
  players: readonly PlayerData[];
};

export type RosterExportSettings = {
  /** Nickname checkbox in the saved event settings. */
  includeNickname: boolean;
  /** Player ID checkbox in the saved event settings. */
  includePlayerId: boolean;
  /** Team phone checkbox in the saved event settings. */
  includeTeamPhone: boolean;
  /** Drop Zone checkbox in the saved event settings. */
  includeDropZone: boolean;
  /** Logo upload/collection enabled in the saved event settings. */
  includeTeamLogo: boolean;
  /** Number of players allowed by the event; only existing players are exported. */
  maxPlayers: number;
};

type ColumnSpec = {
  heading: string;
  value: (team: TeamData) => string;
};

function cleanCell(value: unknown): string {
  const raw = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 1000);

  // Registration data is untrusted. Prevent spreadsheet formula injection.
  return /^[=+@-]/.test(raw) ? "'" + raw : raw;
}

function normalizedMaxPlayers(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(20, Math.floor(value)));
}

export function buildRosterTable(
  teams: readonly TeamData[],
  settings: RosterExportSettings,
): { headers: string[]; rows: string[][] } {
  const cols: ColumnSpec[] = [
    { heading: "Nama Team", value: team => cleanCell(team.teamName) },
  ];

  if (settings.includeTeamPhone) {
    cols.push({ heading: "Nomor HP Team", value: team => cleanCell(team.teamPhone) });
  }
  if (settings.includeDropZone) {
    cols.push({ heading: "Drop Zone", value: team => cleanCell(team.dropZone) });
  }
  if (settings.includeTeamLogo) {
    // Store a URL as text; embedding remote images would expose credentials and slow exports.
    cols.push({ heading: "Link Logo Team", value: team => cleanCell(team.logoUrl) });
  }

  // If the admin unchecks either field, NO columns of that field are created.
  if (settings.includeNickname || settings.includePlayerId) {
    for (let i = 0; i < normalizedMaxPlayers(settings.maxPlayers); i++) {
      if (settings.includeNickname) {
        cols.push({
          heading: `Nickname Player ${i + 1}`,
          value: team => cleanCell(team.players[i]?.nickname),
        });
      }
      if (settings.includePlayerId) {
        cols.push({
          heading: `ID Player ${i + 1}`,
          value: team => cleanCell(team.players[i]?.playerId),
        });
      }
    }
  }

  return {
    headers: cols.map(col => col.heading),
    rows: teams.map(team => cols.map(col => col.value(team))),
  };
}

function excelColumnLabel(number: number): string {
  let n = number;
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Builds a single-sheet XLSX that fits to 1 printed A4 landscape page.
 * With many players/teams the print scaling can make text tiny; the editable
 * workbook itself remains full size.
 */
export async function makeRosterExcel(
  eventName: string,
  teams: readonly TeamData[],
  settings: RosterExportSettings,
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Panboy Community";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Data Player", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
    },
    properties: { defaultRowHeight: 20 },
  });

  worksheet.headerFooter.oddHeader = "&CPANBOY COMMUNITY";
  worksheet.headerFooter.oddFooter = "&CPage &P / &N";
  worksheet.pageSetup.horizontalCentered = true;

  const { headers, rows } = buildRosterTable(teams, settings);
  worksheet.addRow(headers);
  for (const row of rows) worksheet.addRow(row);

  const lastCol = excelColumnLabel(headers.length);
  const lastRow = Math.max(1, rows.length + 1);
  worksheet.pageSetup.printArea = `A1:${lastCol}${lastRow}`;

  // Simple clean table; all teams follow each other without separate sheets/pages.
  worksheet.getRow(1).height = 27;
  for (let col = 1; col <= headers.length; col++) {
    const heading = headers[col - 1];
    worksheet.getColumn(col).width = heading === "Nama Team" ? 30
      : heading === "Link Logo Team" ? 35
      : heading === "Nomor HP Team" ? 22
      : heading === "Drop Zone" ? 16 : 20;
  }

  for (let row = 1; row <= lastRow; row++) {
    for (let col = 1; col <= headers.length; col++) {
      const cell = worksheet.getRow(row).getCell(col);
      cell.numFmt = "@"; // Preserve long player IDs and phone numbers.
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
      cell.border = {
        top: { style: "thin", color: { argb: "FF222222" } },
        left: { style: "thin", color: { argb: "FF222222" } },
        bottom: { style: "thin", color: { argb: "FF222222" } },
        right: { style: "thin", color: { argb: "FF222222" } },
      };
      if (row === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE8D9" } };
        cell.font = { bold: true, color: { argb: "FF171717" }, size: 10 };
      } else {
        cell.font = { color: { argb: "FF171717" }, size: 10 };
      }
    }
  }

  // No extra index or empty columns; the first cell of each row is always team name.
  worksheet.autoFilter = { from: "A1", to: `${lastCol}1` };

  const bytes = await workbook.xlsx.writeBuffer();
  const buffer = Uint8Array.from(bytes).buffer;
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Call ONLY on an admin button click after server-side authorization has already
 * checked the role and the requested event.
 */
export async function downloadRosterExcel(
  eventName: string,
  teams: readonly TeamData[],
  settings: RosterExportSettings,
): Promise<void> {
  if (typeof document === "undefined") throw new Error("Download hanya tersedia di browser.");
  const file = await makeRosterExcel(eventName, teams, settings);
  const url = URL.createObjectURL(file);
  const safeName = eventName
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70) || "event";

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Data-Player-${safeName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
