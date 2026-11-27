import { env } from "cloudflare:workers";
import {
  ensureAdminsTable,
  hashPassword,
  extraPermissions,
  OWNER_EMAIL,
  requestAdmin,
} from "../../../../lib/admin-auth";

async function owner(request: Request) {
  return (await requestAdmin(request))?.isOwner;
}
const allowedDurations = new Set([1, 3, 7, 14, 30, 180, 365]);
function durationDays(body: Record<string, unknown>, required = false) {
  const days = Number(body.durationDays);
  if (!days && !required) return 0;
  return allowedDurations.has(days) ? days : -1;
}
function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 86_400_000).toISOString();
}
function values(body: Record<string, unknown>) {
  return [
    String(body.email || "")
      .trim()
      .toLowerCase(),
    String(body.name || "").trim(),
    body.canEvents ? 1 : 0,
    body.canPartners ? 1 : 0,
    body.canProducts ? 1 : 0,
    body.canOrders ? 1 : 0,
    body.canAppearance ? 1 : 0,
    body.canLeaderboard ? 1 : 0,
    body.canLeaderboardDesign ? 1 : 0,
    body.canLiveObs ? 1 : 0,
    body.canMembers ? 1 : 0,
    body.canFinance ? 1 : 0,
    body.active === false ? 0 : 1,
  ] as const;
}
function extraValue(body: Record<string, unknown>) {
  return JSON.stringify(extraPermissions(JSON.stringify(body)));
}

export async function GET(request: Request) {
  if (!(await owner(request)))
    return Response.json(
      { error: "Hanya admin utama yang dapat mengatur akses" },
      { status: 403 },
    );
  await ensureAdminsTable();
  const result = await env.DB.prepare(
    "SELECT id,email,name,can_events AS canEvents,can_partners AS canPartners,can_products AS canProducts,can_orders AS canOrders,can_appearance AS canAppearance,can_leaderboard AS canLeaderboard,can_leaderboard_design AS canLeaderboardDesign,can_live_obs AS canLiveObs,can_members AS canMembers,can_finance AS canFinance,extra_permissions AS extraPermissions,active,access_expires_at AS accessExpiresAt FROM admins ORDER BY id DESC",
  ).all();
  return Response.json({ ownerEmail: OWNER_EMAIL, admins: result.results.map(row => ({...row, ...extraPermissions((row as Record<string, unknown>).extraPermissions)})) });
}

export async function POST(request: Request) {
  if (!(await owner(request)))
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  await ensureAdminsTable();
  const body = (await request.json()) as Record<string, unknown>,
    data = values(body),
    password = String(body.password || ""),
    days = durationDays(body, true);
  if (!data[0] || !data[0].includes("@") || data[0] === OWNER_EMAIL)
    return Response.json(
      { error: "Masukkan email admin tambahan yang valid" },
      { status: 400 },
    );
  if (password.length < 8)
    return Response.json(
      { error: "Password minimal 8 karakter" },
      { status: 400 },
    );
  if (days < 0)
    return Response.json(
      { error: "Pilih durasi akses admin" },
      { status: 400 },
    );
  const passwordData = await hashPassword(password),
    now = new Date(),
    nowText = now.toISOString(),
    expiresAt = addDays(now, days);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO admins(email,name,can_events,can_partners,can_products,can_orders,can_appearance,can_leaderboard,can_leaderboard_design,can_live_obs,can_members,can_finance,active,access_expires_at,created_at,extra_permissions) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(...data, expiresAt, nowText, extraValue(body)),
      env.DB.prepare(
        "INSERT INTO admin_credentials(email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?)",
      ).bind(data[0], passwordData.hash, passwordData.salt, nowText, nowText),
    ]);
  } catch {
    return Response.json(
      { error: "Email tersebut sudah terdaftar" },
      { status: 409 },
    );
  }
  return Response.json({ ok: true, accessExpiresAt: expiresAt });
}

export async function PUT(request: Request) {
  if (!(await owner(request)))
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>,
    id = Number(body.id),
    data = values(body),
    password = String(body.password || ""),
    days = durationDays(body),
    old = await env.DB.prepare(
      "SELECT email,access_expires_at AS accessExpiresAt FROM admins WHERE id=?",
    )
      .bind(id)
      .first<{ email: string; accessExpiresAt: string | null }>();
  if (!old)
    return Response.json({ error: "Admin tidak ditemukan" }, { status: 404 });
  if (password && password.length < 8)
    return Response.json(
      { error: "Password minimal 8 karakter" },
      { status: 400 },
    );
  if (days < 0)
    return Response.json({ error: "Durasi tidak valid" }, { status: 400 });
  let expiresAt = old.accessExpiresAt;
  if (days > 0) {
    const current = expiresAt ? new Date(expiresAt) : new Date(),
      base = current.getTime() > Date.now() ? current : new Date();
    expiresAt = addDays(base, days);
  }
  await env.DB.prepare(
    "UPDATE admins SET email=?,name=?,can_events=?,can_partners=?,can_products=?,can_orders=?,can_appearance=?,can_leaderboard=?,can_leaderboard_design=?,can_live_obs=?,can_members=?,can_finance=?,active=?,access_expires_at=?,extra_permissions=? WHERE id=?",
  )
    .bind(...data, expiresAt, extraValue(body), id)
    .run();
  if (old.email !== data[0])
    await env.DB.batch([
      env.DB.prepare("UPDATE admin_credentials SET email=? WHERE email=?").bind(
        data[0],
        old.email,
      ),
      env.DB.prepare("UPDATE admin_sessions SET email=? WHERE email=?").bind(
        data[0],
        old.email,
      ),
    ]);
  if (password) {
    const passwordData = await hashPassword(password);
    await env.DB.prepare(
      "UPDATE admin_credentials SET password_hash=?,password_salt=?,updated_at=? WHERE email=?",
    )
      .bind(
        passwordData.hash,
        passwordData.salt,
        new Date().toISOString(),
        data[0],
      )
      .run();
    await env.DB.prepare("DELETE FROM admin_sessions WHERE email=?")
      .bind(data[0])
      .run();
  }
  return Response.json({ ok: true, accessExpiresAt: expiresAt });
}

export async function DELETE(request: Request) {
  if (!(await owner(request)))
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id")),
    row = await env.DB.prepare("SELECT email FROM admins WHERE id=?")
      .bind(id)
      .first<{ email: string }>();
  if (row)
    await env.DB.batch([
      env.DB.prepare("DELETE FROM admin_sessions WHERE email=?").bind(
        row.email,
      ),
      env.DB.prepare("DELETE FROM admin_credentials WHERE email=?").bind(
        row.email,
      ),
      env.DB.prepare("DELETE FROM admins WHERE id=?").bind(id),
    ]);
  return Response.json({ ok: true });
}
