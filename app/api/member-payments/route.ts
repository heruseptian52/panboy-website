import { env } from "cloudflare:workers";
import { getCommunityMembers } from "../../../lib/members";
import { getSettings } from "../../../lib/settings";
import {
  ensureMemberPayments,
  invoice,
  MEMBERSHIP_PACKAGES,
} from "../../../lib/member-payments";
export async function POST(r: Request) {
  await ensureMemberPayments();
  const b = (await r.json()) as Record<string, unknown>,
    memberId = Number(b.memberId),
    months = Number(b.months),
    tier = String(b.tier || "").toUpperCase(),
    amount = MEMBERSHIP_PACKAGES[tier]?.[months];
  if (!memberId || !amount)
    return Response.json(
      { error: "Lengkapi data pembayaran dengan benar." },
      { status: 400 },
    );
  if ((await getSettings()).memberQrisEnabled === "false")
    return Response.json({ error: "Pembayaran QRIS sedang dinonaktifkan." }, { status: 403 });
  const member = (await getCommunityMembers(false)).find(
    (x) => x.id === memberId,
  );
  if (!member)
    return Response.json({ error: "Team tidak ditemukan." }, { status: 404 });
  const buyerName = member.teamName.slice(0, 80), whatsapp = String(member.whatsapp || "").replace(/\D/g, "").slice(0, 18);
  const code = invoice(),
    now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO member_payments(invoice,member_id,team_name,buyer_name,whatsapp,tier,months,amount,payment_method,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      code,
      memberId,
      member.teamName,
      buyerName,
      whatsapp,
      tier,
      months,
      amount,
      "QRIS",
      "WAITING_PAYMENT",
      now,
      now,
    )
    .run();
  return Response.json({
    ok: true,
    invoice: code,
    amount,
    tier,
  });
}
export async function GET(r: Request) {
  await ensureMemberPayments();
  const code = String(new URL(r.url).searchParams.get("invoice") || "");
  if (!code)
    return Response.json({ error: "Invoice wajib diisi." }, { status: 400 });
  const row = await env.DB.prepare(
    "SELECT invoice,team_name AS teamName,months,amount,status,created_at AS createdAt,verified_at AS verifiedAt,membership_start AS membershipStart,membership_end AS membershipEnd FROM member_payments WHERE invoice=?",
  )
    .bind(code)
    .first();
  return row
    ? Response.json(row, { headers: { "Cache-Control": "private, no-store" } })
    : Response.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
}
