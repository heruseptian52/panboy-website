export type RosterOptions = {
  playersEnabled: boolean;
  logoEnabled: boolean;
  logoRequired: boolean;
  phoneEnabled: boolean;
  zonesEnabled: boolean;
  maps: string[];
  groupUrl: string;
  publicRegistrationEnabled?: boolean;
  excelNicknameEnabled?: boolean;
  excelPlayerIdEnabled?: boolean;
};
export const defaultOptions: RosterOptions = {
  playersEnabled: true, logoEnabled: true, logoRequired: true, phoneEnabled: false, zonesEnabled: false,
  maps: ["Erangel", "Miramar", "Rondo"], groupUrl: "", publicRegistrationEnabled: false, excelNicknameEnabled: true, excelPlayerIdEnabled: true,
};
export function readOptions(raw: string): RosterOptions {
  try { return {...defaultOptions, ...JSON.parse(raw || "{}")}; }
  catch { return {...defaultOptions}; }
}
export function validateOptions(options: RosterOptions) {
  if (![options.playersEnabled, options.logoEnabled, options.logoRequired, options.phoneEnabled, options.zonesEnabled].every(v => typeof v === "boolean"))
    throw new Error("Pengaturan form tidak valid.");
  if (!Array.isArray(options.maps) || options.maps.length !== 3 || options.maps.some(v => typeof v !== "string" || !v.trim() || v.trim().length > 40))
    throw new Error("Isi tiga nama map, maksimal 40 karakter per map.");
  const maps = options.maps.map(v => v.trim());
  if (new Set(maps.map(v => v.toLowerCase())).size !== 3) throw new Error("Nama map harus berbeda.");
  const groupUrl = String(options.groupUrl || "").trim();
  if (groupUrl && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?(?:\?[^#\s]*)?$/.test(groupUrl))
    throw new Error("Gunakan link undangan grup dari chat.whatsapp.com.");
  return {
    playersEnabled: options.playersEnabled, logoEnabled: options.logoEnabled, logoRequired: options.logoRequired,
    phoneEnabled: options.phoneEnabled, zonesEnabled: options.zonesEnabled, maps, groupUrl,
    publicRegistrationEnabled: options.publicRegistrationEnabled === true,
    excelNicknameEnabled: options.excelNicknameEnabled !== false,
    excelPlayerIdEnabled: options.excelPlayerIdEnabled !== false,
  };
}
export function normalizeTeamPhone(input: unknown) {
  const phone = String(input || "").trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,18}$/.test(phone)) throw new Error("Isi nomor HP team yang valid, 8–18 digit.");
  return phone;
}
export function readZones(input: unknown) {
  if (!Array.isArray(input) || input.length !== 3 || input.some(v => typeof v !== "string" || !v.trim() || v.trim().length > 100))
    throw new Error("Isi lokasi drop zone untuk ketiga map, maksimal 100 karakter per lokasi.");
  return input.map(v => v.trim());
}
