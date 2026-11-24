export type PlayerStatus = "alive" | "knocked" | "eliminated";
export type TeamLiveState = { pointsAdjust: number; elimsAdjust: number; players: [PlayerStatus, PlayerStatus, PlayerStatus, PlayerStatus] };
export type LiveTemplate = { id: string; name: string; panelWidth: number; panelHeight: number; rowHeight: number; headerHeight: number; rankX: number; logoX: number; teamX: number; ptsX: number; elimsX: number; aliveX: number; fontSize: number; logoSize: number; fontFamily: string; textColor: string; headerTextColor: string; backgroundColor: string; backgroundOpacity: number; headerColor: string; aliveColor: string; knockedColor: string; eliminatedColor: string; dividerColor: string; spacing: number; rowOpacity: number };

// Protected broadcast geometry. Keep POS -> LOGO -> TEAM -> PTS -> ELIMS -> ALIVE
// at these coordinates unless the LIVE LEADERBOARD VERTICAL layout is explicitly changed.
export const LIVE_LEADERBOARD_VERTICAL_LOCKED = Object.freeze({
  panelWidth: 234, panelHeight: 790, rowHeight: 34, headerHeight: 28, spacing: 1,
  rankX: 16, logoX: 42, teamX: 64, ptsX: 135, elimsX: 179, aliveX: 207,
  fontSize: 15, logoSize: 25,
});

export const baseTemplate: LiveTemplate = {
  id: "pubg-style", name: "PUBG STYLE", ...LIVE_LEADERBOARD_VERTICAL_LOCKED,
  fontFamily: "Arial Black", textColor: "#f5f8fb", headerTextColor: "#ffffff",
  backgroundColor: "#071b2c", backgroundOpacity: .9, headerColor: "#ef4e43",
  aliveColor: "#24f6b0", knockedColor: "#f04444", eliminatedColor: "#52606b",
  dividerColor: "#567087", spacing: 1, rowOpacity: .94,
};
export const defaultTemplates: LiveTemplate[] = [
  baseTemplate,
  { ...baseTemplate, id: "panboy-gold", name: "PANBOY GOLD", headerColor: "#c99a32", aliveColor: "#52e5a9", dividerColor: "#715a2a" },
  { ...baseTemplate, id: "panboy-red", name: "PANBOY RED", headerColor: "#d62f2f", aliveColor: "#37efb1", dividerColor: "#6a3030" },
];

export function cleanTemplate(source: Partial<LiveTemplate>, fallback = baseTemplate): LiveTemplate {
  const stringValue = (value: unknown, defaultValue: string) => String(value || defaultValue).slice(0, 50),
    numberValue = (value: unknown, defaultValue: number, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || defaultValue));
  return {
    id: stringValue(source.id, fallback.id), name: stringValue(source.name, fallback.name),
    ...LIVE_LEADERBOARD_VERTICAL_LOCKED,
    fontFamily: stringValue(source.fontFamily, fallback.fontFamily), textColor: stringValue(source.textColor, fallback.textColor), headerTextColor: stringValue(source.headerTextColor, fallback.headerTextColor),
    backgroundColor: stringValue(source.backgroundColor, fallback.backgroundColor), backgroundOpacity: numberValue(source.backgroundOpacity, fallback.backgroundOpacity, .1, 1),
    headerColor: stringValue(source.headerColor, fallback.headerColor), aliveColor: stringValue(source.aliveColor, fallback.aliveColor), knockedColor: stringValue(source.knockedColor, fallback.knockedColor), eliminatedColor: stringValue(source.eliminatedColor, fallback.eliminatedColor), dividerColor: stringValue(source.dividerColor, fallback.dividerColor),
    spacing: LIVE_LEADERBOARD_VERTICAL_LOCKED.spacing, rowOpacity: numberValue(source.rowOpacity, fallback.rowOpacity, .1, 1),
  };
}
export function freshState(): TeamLiveState { return { pointsAdjust: 0, elimsAdjust: 0, players: ["alive", "alive", "alive", "alive"] }; }
