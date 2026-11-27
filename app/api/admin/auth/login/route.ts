import { env } from "cloudflare:workers";
import {
  createSession,
  ensureAdminsTable,
  permissionsFor,
  sessionCookie,
  verifyPassword,
} from "../../../../../lib/admin-auth";

export async function POST(request: Request) {
  const invalidCredentials = () => Response.json(
    { error: "Email atau password salah" }, { status: 401 },
  );
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== "string" || typeof body.password !== "string")
    return invalidCredentials();
  const email = body.email.trim().toLowerCase(), password = body.password;
  if (!email || email.length > 254 || !password || password.length > 4096)
    return invalidCredentials();
  await ensureAdminsTable();
  const credentials = await env.DB.prepare(
    "SELECT password_hash,password_salt FROM admin_credentials WHERE email=?",
  ).bind(email).first<{ password_hash: string; password_salt: string }>();
  if (
    !credentials ||
    !(await verifyPassword(
      password,
      credentials.password_hash,
      credentials.password_salt,
    ))
  )
    return invalidCredentials();
  if (!(await permissionsFor(email)))
    return Response.json(
      {
        error:
          "Akses admin nonaktif atau durasinya sudah habis. Hubungi Admin Utama untuk memperpanjang.",
      },
      { status: 403 },
    );
  const session = await createSession(email);
  return Response.json(
    { ok: true },
    {
      headers: { "Set-Cookie": sessionCookie(session.token, session.expires) },
    },
  );
}
