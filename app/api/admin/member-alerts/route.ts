import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";

export async function GET(request: Request) {
  const admin = await requestAdmin(request);
  if (!admin?.isOwner && !admin?.members && !admin?.memberDues)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });

  const queries = [
    ...(admin.members ? [env.DB.prepare("SELECT COUNT(*) AS total FROM member_registrations WHERE status='PENDING' AND hidden=0")] : []),
    ...(admin.memberDues ? [env.DB.prepare("SELECT COUNT(*) AS total FROM member_payments WHERE status='WAITING_VERIFICATION'")] : []),
  ];
  const results = await env.DB.batch(queries);
  return Response.json({
    registrations: admin.members ? Number((results[0]?.results[0] as { total?: number } | undefined)?.total || 0) : 0,
    payments: admin.memberDues ? Number((results[admin.members ? 1 : 0]?.results[0] as { total?: number } | undefined)?.total || 0) : 0,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
