import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";
import { addMonths, isoDate } from "../../../../lib/member-payments";
import { audit } from "../../../../lib/audit";
import { correctedEnd, packageAmount } from "../../../../lib/member-dues-correction";
export async function GET(r: Request) {
  const a = await requestAdmin(r);
  if (!a?.isOwner && !a?.memberDues)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT * FROM member_payments ORDER BY created_at DESC LIMIT 100",
  ).all();
  return Response.json(
    { rows: rows.results },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(r: Request) {
  const a = await requestAdmin(r);
  if (!a?.isOwner && !a?.memberDues)
    return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
  const b = (await r.json()) as Record<string, unknown>,
    invoice = String(b.invoice || ""),
    action = String(b.action || "");
  const row = await env.DB.prepare(
    "SELECT * FROM member_payments WHERE invoice=?",
  )
    .bind(invoice)
    .first<any>();
  if (!row)
    return Response.json(
      { error: "Pembayaran tidak ditemukan." },
      { status: 404 },
    );
  if (action === "correct" || action === "cancel") {
    if (!a.isOwner) return Response.json({ error: "Hanya Admin Utama yang dapat mengoreksi atau membatalkan iuran." }, { status: 403 });
    if (String(row.payment_method || "QRIS").toUpperCase() !== "QRIS")
      return Response.json({ error: "Transaksi iPaymu harus dikoreksi melalui iPaymu agar nominal penyedia pembayaran tetap sesuai." }, { status: 409 });
    if (row.status === "CANCELLED") return Response.json({ error: "Iuran ini sudah dibatalkan." }, { status: 409 });
    const isPaid = row.status === "LUNAS";
    if (action === "correct" && !isPaid) return Response.json({ error: "Hanya pembayaran lunas yang dapat dikoreksi. Pembayaran menunggu dapat ditolak." }, { status: 409 });
    const tier = String(b.tier || "").toUpperCase(), months = Number(b.months);
    const amount = action === "correct" ? packageAmount(tier, months) : 0;
    if (action === "correct" && !amount) return Response.json({ error: "Pilih tier dan durasi yang valid." }, { status: 400 });
    const now = new Date().toISOString(), today = now.slice(0, 10);
    const member = await env.DB.prepare("SELECT membership_start,membership_end,active FROM community_members WHERE id=?").bind(row.member_id).first<any>();
    if (!member) return Response.json({ error: "Data member tidak ditemukan." }, { status: 404 });
    const delta = isPaid ? (action === "correct" ? months : 0) - Number(row.months) : 0;
    const currentEnd = String(member.membership_end || "");
    const anchorDay = Number(String(member.membership_start || row.membership_start || "").slice(8,10)) || undefined;
    const end = correctedEnd(currentEnd, delta, String(row.membership_end || row.paid_at || today), anchorDay);
    const later = isPaid ? await env.DB.prepare("SELECT id,tier,membership_start,membership_end FROM member_payments WHERE member_id=? AND id>? AND status='LUNAS' ORDER BY id").bind(row.member_id,row.id).all<any>() : { results: [] };
    const statements = [
      action === "correct"
        ? env.DB.prepare("UPDATE member_payments SET tier=?,months=?,amount=?,membership_end=?,verified_by=?,verified_at=?,updated_at=? WHERE id=? AND status='LUNAS'").bind(tier,months,amount,correctedEnd(String(row.membership_end || ""),delta,String(row.membership_start || row.paid_at || today),anchorDay),a.email,now,now,row.id)
        : env.DB.prepare("UPDATE member_payments SET status='CANCELLED',verified_by=?,verified_at=?,updated_at=? WHERE id=? AND status!='CANCELLED'").bind(a.email,now,now,row.id),
    ];
    const latest = await env.DB.prepare("SELECT tier FROM member_payments WHERE member_id=? AND id!=? AND status='LUNAS' ORDER BY id DESC LIMIT 1").bind(row.member_id,row.id).first<{tier:string}>();
    const effectiveTier = later.results.length ? String(later.results.at(-1)?.tier || latest?.tier || row.tier || "C") : (action === "correct" ? tier : latest?.tier || String(row.tier || "C"));
    if (delta) statements.push(env.DB.prepare("UPDATE community_members SET active=?,membership_end=?,membership_tier=?,updated_at=? WHERE id=?").bind(end>=today?1:0,end,`TIER ${effectiveTier}`,now,row.member_id));
    else if (action === "correct" && !later.results.length) statements.push(env.DB.prepare("UPDATE community_members SET membership_tier=?,updated_at=? WHERE id=?").bind(`TIER ${tier}`,now,row.member_id));
    for (const next of later.results) {
      statements.push(env.DB.prepare("UPDATE member_payments SET membership_start=?,membership_end=?,updated_at=? WHERE id=?").bind(correctedEnd(String(next.membership_start || ""),delta,today,anchorDay),correctedEnd(String(next.membership_end || ""),delta,today,anchorDay),now,next.id));
    }
    await env.DB.batch(statements);
    await audit(a.email, action === "correct" ? "KOREKSI PEMBAYARAN" : "BATAL PEMBAYARAN", "member_payment", invoice,
      `${row.team_name}: Rp${row.amount} / ${row.months} bulan → Rp${amount} / ${action === "correct" ? months : 0} bulan; masa aktif ${currentEnd || "-"} → ${end || "-"}`);
    return Response.json({ ok: true, membershipEnd: end });
  }
  if (action === "reject") {
    if (row.status === "LUNAS")
      return Response.json(
        { error: "Pembayaran yang sudah lunas tidak dapat ditolak." },
        { status: 409 },
      );
    await env.DB.prepare(
      "UPDATE member_payments SET status='REJECTED',verified_by=?,verified_at=?,updated_at=? WHERE invoice=? AND status!='LUNAS'",
    )
      .bind(
        a.email,
        new Date().toISOString(),
        new Date().toISOString(),
        invoice,
      )
      .run();
    await audit(
      a.email,
      "reject",
      "member_payment",
      invoice,
      "Menolak pembayaran QRIS manual",
    );
    return Response.json({ ok: true });
  }
  if (action !== "verify")
    return Response.json({ error: "Aksi tidak valid." }, { status: 400 });
  if (String(row.payment_method || "QRIS").toUpperCase() === "IPAYMU")
    return Response.json(
      { error: "Pembayaran iPaymu hanya dapat dilunasi otomatis melalui callback iPaymu yang valid." },
      { status: 409 },
    );
  if (row.status === "LUNAS")
    return Response.json({
      ok: true,
      duplicate: true,
      start: row.membership_start,
      end: row.membership_end,
    });
  if (row.status === "REJECTED" || row.status === "CANCELLED")
    return Response.json({ error: "Pembayaran yang ditolak atau dibatalkan tidak dapat diverifikasi." }, { status: 409 });
  const now = new Date(),
    existing = await env.DB.prepare(
      "SELECT membership_start AS start,membership_end AS end FROM community_members WHERE id=?",
    )
      .bind(row.member_id)
      .first<{ start: string; end: string }>();
  const today = isoDate(now),
    activeEnd =
      existing?.end && existing.end > today
        ? new Date(`${existing.end}T00:00:00Z`)
        : now,
    start = isoDate(activeEnd),
    end = isoDate(addMonths(activeEnd, Number(row.months)));
  await env.DB.prepare(
    "UPDATE member_payments SET status='LUNAS',paid_at=?,verified_by=?,verified_at=?,membership_start=?,membership_end=?,updated_at=? WHERE invoice=? AND status!='LUNAS'",
  )
    .bind(
      today,
      a.email,
      now.toISOString(),
      start,
      end,
      now.toISOString(),
      invoice,
    )
    .run();
  if (row.member_id) {
    await env.DB.prepare(
      "UPDATE community_members SET active=1,membership_start=?,membership_end=?,membership_tier=?,updated_at=? WHERE id=?",
    )
      .bind(start, end, `TIER ${row.tier || "C"}`, now.toISOString(), row.member_id)
      .run();
  }
  await audit(
    a.email,
    "verify",
    "member_payment",
    invoice,
    `Lunas ${row.team_name}; aktif ${start} sampai ${end}`,
  );
  return Response.json({ ok: true, start, end });
}
