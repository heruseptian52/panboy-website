import { env } from "cloudflare:workers";

export type CommunityMember = {
  id: number;
  teamName: string;
  whatsapp: string;
  logoUrl: string;
  logoX: number;
  logoY: number;
  logoScale: number;
  instagramUsername: string;
  instagramUrl: string;
  tiktokUsername: string;
  tiktokUrl: string;
  playerPhoto1Url: string;
  playerPhoto2Url: string;
  playerPhoto1X: number;
  playerPhoto1Y: number;
  playerPhoto1Scale: number;
  playerPhoto2X: number;
  playerPhoto2Y: number;
  playerPhoto2Scale: number;
  active: boolean;
  sortOrder: number;
  membershipStart: string;
  membershipEnd: string;
  membershipTier: string;
};

export function normalizeMemberName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

// Older staging schemas may predate the columns created by the member payment
// workflow. Read those schemas without altering them from a public request.
const completeMemberSchemas = new WeakSet<object>();
const optionalColumns = [
  ["whatsapp", "whatsapp", "''"],
  ["logo_x", "logoX", "0"], ["logo_y", "logoY", "0"], ["logo_scale", "logoScale", "100"],
  ["membership_start", "membershipStart", "''"], ["membership_end", "membershipEnd", "''"],
  ["membership_tier", "membershipTier", "''"],
] as const;

export async function prepareCommunityMembers(activeOnly: boolean, includePhone = !activeOnly, homeOrder = false) {
  const db = env.DB;
  let available: Set<string> | undefined;
  if (!completeMemberSchemas.has(db)) {
    const schema = await db.prepare("PRAGMA table_info(community_members)").all<{name:string}>();
    available = new Set(schema.results.map(column => column.name));
    if (optionalColumns.every(([column]) => available!.has(column))) completeMemberSchemas.add(db);
  }
  const exists = (column:string) => !available || available.has(column);
  const optional = optionalColumns.map(([column, alias, fallback]) =>
    `${exists(column) && (column !== "whatsapp" || includePhone) ? column : fallback} AS ${alias}`);
  const endDate = exists("membership_end") ? "membership_end" : "''";
  const where = activeOnly ? `WHERE active=1 AND (${endDate}='' OR ${endDate}>=date('now'))` : "";
  const order = homeOrder ? "" : `active DESC, CASE WHEN ${endDate}<>'' AND ${endDate}>=date('now') THEN 0 ELSE 1 END ASC, `;
  return db.prepare(`SELECT id,team_name AS teamName,logo_url AS logoUrl,${optional.join(",")},
    instagram_username AS instagramUsername,instagram_url AS instagramUrl,tiktok_username AS tiktokUsername,tiktok_url AS tiktokUrl,
    player_photo_1_url AS playerPhoto1Url,player_photo_2_url AS playerPhoto2Url,player_photo_1_x AS playerPhoto1X,
    player_photo_1_y AS playerPhoto1Y,player_photo_1_scale AS playerPhoto1Scale,player_photo_2_x AS playerPhoto2X,
    player_photo_2_y AS playerPhoto2Y,player_photo_2_scale AS playerPhoto2Scale,active,sort_order AS sortOrder
    FROM community_members ${where} ORDER BY ${order}sort_order ASC, team_name COLLATE NOCASE ASC`);
}

export async function getCommunityMembers(activeOnly = true) {
  const query = await prepareCommunityMembers(activeOnly);
  const result = await query.all<CommunityMember>();
  return (result.results || []).map((item) => ({ ...item, active: Boolean(item.active) }));
}
