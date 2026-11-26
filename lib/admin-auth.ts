import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const OWNER_EMAIL = "heruseptian52@gmail.com";
export const BOOTSTRAP_CHATGPT_EMAIL = "heruseptian52@gmail.com";
export const SESSION_COOKIE = "panboy_admin_session";
export type Permission =
  | "events"
  | "partners"
  | "products"
  | "orders"
  | "appearance"
  | "leaderboard"
  | "leaderboardDesign"
  | "liveObs"
  | "members"
  | "finance"
  | "memberDues" | "blacklist" | "communityProfile" | "services" | "topup" | "analytics" | "market";
export type AdminPermissions = {
  email: string;
  name: string;
  isOwner: boolean;
  events: boolean;
  partners: boolean;
  products: boolean;
  orders: boolean;
  appearance: boolean;
  leaderboard: boolean;
  leaderboardDesign: boolean;
  liveObs: boolean;
  members: boolean;
  finance: boolean;
  memberDues: boolean;
  blacklist: boolean;
  communityProfile: boolean;
  services: boolean;
  topup: boolean;
  analytics: boolean;
  market: boolean;
  manageAdmins: boolean;
};
let adminSchemaReady: Promise<void> | undefined;
export async function ensureAdminsTable() {
  // One guarded check per worker instance also supports databases opened before migration.
  adminSchemaReady ??= (async () => {
    const columns = await env.DB.prepare("PRAGMA table_info(admins)").all<{ name: string }>();
    if (!columns.results.some((column) => column.name === "extra_permissions")) {
      await env.DB.prepare("ALTER TABLE admins ADD COLUMN extra_permissions TEXT NOT NULL DEFAULT '{}'").run();
      await env.DB.prepare("UPDATE admins SET extra_permissions = '{\"memberDues\":true,\"blacklist\":true}' WHERE can_members = 1").run();
    }
  })().catch(error => { adminSchemaReady = undefined; throw error; });
  return adminSchemaReady;
}
const extraKeys = ["memberDues", "blacklist", "communityProfile", "services", "topup", "analytics", "market"] as const;
export function extraPermissions(value: unknown) {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(String(value || "{}")); } catch {}
  return Object.fromEntries(extraKeys.map(key => [key, parsed[key] === true])) as Record<(typeof extraKeys)[number], boolean>;
}
const enc = new TextEncoder();
function hex(bytes: ArrayBuffer | Uint8Array) {
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
function bytesFromHex(value: string) {
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex
    ? bytesFromHex(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    256,
  );
  return { hash: hex(bits), salt: hex(salt) };
}
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
) {
  const x = await hashPassword(password, salt);
  if (x.hash.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++)
    diff |= x.hash.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
async function tokenHash(token: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(token)));
}
export async function createSession(email: string) {
  await ensureAdminsTable();
  const token = hex(crypto.getRandomValues(new Uint8Array(32))),
    hash = await tokenHash(token),
    now = new Date(),
    expires = new Date(now.getTime() + 7 * 86400000);
  await env.DB.prepare(
    "INSERT INTO admin_sessions(token_hash,email,expires_at,created_at) VALUES(?,?,?,?)",
  )
    .bind(hash, email.toLowerCase(), expires.toISOString(), now.toISOString())
    .run();
  return { token, expires };
}
export function sessionCookie(token: string, expires: Date) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`;
}
export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function cookieValue(raw: string | null, name: string) {
  return (
    raw
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(name + "="))
      ?.slice(name.length + 1) || null
  );
}
export async function permissionsFor(
  email: string,
): Promise<AdminPermissions | null> {
  const normalized = email.trim().toLowerCase();
  if (normalized === OWNER_EMAIL)
    return {
      email: normalized,
      name: "Admin Utama",
      isOwner: true,
      events: true,
      partners: true,
      products: true,
      orders: true,
      appearance: true,
      leaderboard: true,
      leaderboardDesign: true,
      liveObs: true,
      members: true,
      finance: true,
      memberDues: true, blacklist: true, communityProfile: true,
      services: true, topup: true, analytics: true, market: true,
      manageAdmins: true,
    };
  await ensureAdminsTable();
  const now = new Date().toISOString(),
    row = await env.DB.prepare(
      "SELECT email,name,can_events,can_partners,can_products,can_orders,can_appearance,can_leaderboard,can_leaderboard_design,can_live_obs,can_members,can_finance,extra_permissions FROM admins WHERE lower(email)=? AND active=1 AND (access_expires_at IS NULL OR access_expires_at>?)",
    )
      .bind(normalized, now)
      .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    email: String(row.email),
    name: String(row.name || ""),
    isOwner: false,
    events: Boolean(row.can_events),
    partners: Boolean(row.can_partners),
    products: Boolean(row.can_products),
    orders: Boolean(row.can_orders),
    appearance: Boolean(row.can_appearance),
    leaderboard: Boolean(row.can_leaderboard),
    leaderboardDesign: Boolean(row.can_leaderboard_design),
    liveObs: Boolean(row.can_live_obs),
    members: Boolean(row.can_members),
    finance: Boolean(row.can_finance),
    ...extraPermissions(row.extra_permissions),
    manageAdmins: false,
  };
}
async function adminFromCookie(raw: string | null) {
  const token = cookieValue(raw, SESSION_COOKIE);
  if (!token) return null;
  await ensureAdminsTable();
  const row = await env.DB.prepare(
    "SELECT email FROM admin_sessions WHERE token_hash=? AND expires_at>?",
  )
    .bind(await tokenHash(token), new Date().toISOString())
    .first<{ email: string }>();
  return row ? permissionsFor(row.email) : null;
}
export async function currentAdmin() {
  const h = await headers();
  return adminFromCookie(h.get("cookie"));
}
export async function requireAdminPage(returnTo: string) {
  const admin = await currentAdmin();
  if (admin) return admin;
  redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`);
}
export async function requestAdmin(r: Request) {
  return adminFromCookie(r.headers.get("cookie"));
}
export async function requirePermission(r: Request, p: Permission) {
  const admin = await requestAdmin(r);
  return admin?.[p] ? admin : null;
}
export async function requireAnyPermission(r: Request, permissions: Permission[]) {
  const admin = await requestAdmin(r);
  return admin && permissions.some((permission) => admin[permission])
    ? admin
    : null;
}
export async function ownerIsConfigured() {
  await ensureAdminsTable();
  return Boolean(
    await env.DB.prepare("SELECT email FROM admin_credentials WHERE email=?")
      .bind(OWNER_EMAIL)
      .first(),
  );
}
