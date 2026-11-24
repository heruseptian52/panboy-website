import { ensureEventsTable } from "../../../lib/events";
import { env } from "cloudflare:workers";
import { normalizeWhatsapp } from "../../../lib/events";
import { createSnapTransaction, midtransConfig, parseRupiah } from "../../../lib/midtrans";

type PlayerInput = { pubgId?: unknown; nickname?: unknown; fullName?: unknown; phone?: unknown };
const clean = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
const normalizedTeam = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const code = () => `PNB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const eventId = Number(body.eventId);
  const teamName = clean(body.teamName, 80);
  const captainName = clean(body.captainName, 80);
  const whatsapp = normalizeWhatsapp(clean(body.whatsapp, 30));
  const teamLogo = clean(body.teamLogo, 500);
  const players = Array.isArray(body.players) ? body.players as PlayerInput[] : [];
  if (!eventId || teamName.length < 2 || captainName.length < 2 || !/^62\d{8,14}$/.test(whatsapp))
    return Response.json({ error: "Lengkapi nama tim, nama kapten, dan WhatsApp yang valid." }, { status: 400 });
  if (players.length < 4 || players.length > 6)
    return Response.json({ error: "Roster wajib berisi 4 sampai 6 player." }, { status: 400 });
  const roster = players.map((item) => ({
    pubgId: clean(item.pubgId, 30).replace(/\s/g, ""),
    nickname: clean(item.nickname, 40),
    fullName: clean(item.fullName, 80),
    phone: normalizeWhatsapp(clean(item.phone, 30)),
  }));
  if (roster.some((p) => !/^\d{5,20}$/.test(p.pubgId) || p.nickname.length < 2))
    return Response.json({ error: "Setiap player wajib memiliki ID PUBG angka dan nickname." }, { status: 400 });
  if (new Set(roster.map((p) => p.pubgId)).size !== roster.length)
    return Response.json({ error: "ID PUBG tidak boleh duplikat dalam satu roster." }, { status: 400 });

  await ensureEventsTable();
  const event = await env.DB.prepare("SELECT id,title,status,start_date,registration_fee,max_slots,registration_type AS registrationType FROM events WHERE id=? AND deleted_at=''").bind(eventId).first<{id:number;title:string;status:string;start_date:string;registration_fee:string;max_slots:number;registrationType:string}>();
  if (!event || event.registrationType === "INTERNAL" || !["OPEN REGISTRATION", "REGISTRATION", "FREE REGISTRATION"].includes(event.status.toUpperCase()))
    return Response.json({ error: "Pendaftaran event ini tidak tersedia." }, { status: 409 });
  if (event.start_date && Date.now() >= new Date(`${event.start_date}T19:00:00+07:00`).getTime())
    return Response.json({ error: "Pendaftaran event ini sudah ditutup pukul 19.00 WIB." }, { status: 409 });
  const duplicate = await env.DB.prepare(`SELECT rr.pubg_id_snapshot FROM registration_rosters rr JOIN event_registrations er ON er.id=rr.registration_id WHERE er.event_id=? AND er.registration_status!='cancelled' AND rr.pubg_id_snapshot IN (${roster.map(() => "?").join(",")}) LIMIT 1`).bind(eventId, ...roster.map((p) => p.pubgId)).first<{pubg_id_snapshot:string}>();
  if (duplicate) return Response.json({ error: `ID PUBG ${duplicate.pubg_id_snapshot} sudah terdaftar di event ini.` }, { status: 409 });

  const now = new Date().toISOString();
  const teamKey = normalizedTeam(teamName);
  await env.DB.prepare("INSERT INTO teams(name,normalized_name,logo_url,captain_name,whatsapp,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(normalized_name) DO UPDATE SET name=excluded.name,logo_url=CASE WHEN excluded.logo_url!='' THEN excluded.logo_url ELSE teams.logo_url END,captain_name=excluded.captain_name,whatsapp=excluded.whatsapp,updated_at=excluded.updated_at").bind(teamName, teamKey, teamLogo, captainName, whatsapp, now, now).run();
  const team = await env.DB.prepare("SELECT id FROM teams WHERE normalized_name=?").bind(teamKey).first<{id:number}>();
  if (!team) return Response.json({ error: "Gagal menyimpan tim." }, { status: 500 });
  const amount = parseRupiah(event.registration_fee);
  const free = amount === 0;
  const registrationCode = code();
  const result = await env.DB.prepare("INSERT INTO event_registrations(code,event_id,team_id,team_name,team_logo,captain_name,whatsapp,amount,registration_status,payment_status,payment_order_id,paid_at,created_at) SELECT ?,e.id,?,?,?,?,?,?,?,?,?,?,? FROM events e WHERE e.id=? AND (?=0 OR e.max_slots=0 OR (SELECT COUNT(*) FROM event_registrations x WHERE x.event_id=e.id AND x.payment_status='paid')<e.max_slots)").bind(registrationCode,team.id,teamName,teamLogo,captainName,whatsapp,amount,free?"confirmed":"submitted",free?"paid":"pending",free?"":registrationCode,free?now:"",now,eventId,free?1:0).run();
  if (!result.meta.changes) return Response.json({ error: "Maaf, slot event baru saja penuh." }, { status: 409 });
  const registrationId = Number(result.meta.last_row_id);
  for (let index = 0; index < roster.length; index++) {
    const player = roster[index];
    await env.DB.prepare("INSERT INTO players(pubg_id,nickname,full_name,phone,photo_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(pubg_id) DO UPDATE SET nickname=excluded.nickname,full_name=CASE WHEN excluded.full_name!='' THEN excluded.full_name ELSE players.full_name END,phone=CASE WHEN excluded.phone!='' THEN excluded.phone ELSE players.phone END,updated_at=excluded.updated_at").bind(player.pubgId,player.nickname,player.fullName,player.phone,"",now,now).run();
    const saved = await env.DB.prepare("SELECT id FROM players WHERE pubg_id=?").bind(player.pubgId).first<{id:number}>();
    const membership = await env.DB.prepare("SELECT id FROM team_players WHERE team_id=? AND player_id=?").bind(team.id,saved!.id).first<{id:number}>();
    if (membership) await env.DB.prepare("UPDATE team_players SET slot_number=?,active=1,updated_at=? WHERE id=?").bind(index+1,now,membership.id).run();
    else await env.DB.prepare("INSERT INTO team_players(team_id,player_id,slot_number,active,created_at,updated_at) VALUES(?,?,?,?,?,?)").bind(team.id,saved!.id,index+1,1,now,now).run();
    await env.DB.prepare("INSERT INTO registration_rosters(registration_id,team_id,player_id,slot_number,is_captain,pubg_id_snapshot,nickname_snapshot,full_name_snapshot,phone_snapshot,photo_url_snapshot,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(registrationId,team.id,saved!.id,index+1,index===0?1:0,player.pubgId,player.nickname,player.fullName,player.phone,"",now).run();
  }
  let payment = null;
  if (!free && midtransConfig(env).enabled) {
    try {
      const origin = new URL(request.url).origin;
      payment = await createSnapTransaction(env, { orderId: registrationCode, amount, eventTitle: event.title, teamName, captainName, whatsapp, finishUrl: `${origin}/cek-pendaftaran?code=${encodeURIComponent(registrationCode)}` });
    } catch (error) {
      console.error("midtrans_create_transaction_failed", error instanceof Error ? error.message : "unknown");
    }
  }
  return Response.json({ ok: true, code: registrationCode, eventTitle: event.title, amount, paymentStatus: free ? "paid" : "pending", payment });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const registrationCode = clean(url.searchParams.get("code"), 40).toUpperCase();
  const whatsapp = normalizeWhatsapp(clean(url.searchParams.get("whatsapp"), 30));
  if (!registrationCode || !whatsapp) return Response.json({ error: "Kode dan WhatsApp wajib diisi." }, { status: 400 });
  const registration = await env.DB.prepare("SELECT er.code,er.team_name AS teamName,er.captain_name AS captainName,er.registration_status AS registrationStatus,er.payment_status AS paymentStatus,er.created_at AS createdAt,e.title AS eventTitle,e.event_date AS eventDate FROM event_registrations er JOIN events e ON e.id=er.event_id WHERE er.code=? AND er.whatsapp=?").bind(registrationCode,whatsapp).first();
  if (!registration) return Response.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
  const roster = (await env.DB.prepare("SELECT slot_number AS slotNumber,pubg_id_snapshot AS pubgId,nickname_snapshot AS nickname,full_name_snapshot AS fullName FROM registration_rosters rr JOIN event_registrations er ON er.id=rr.registration_id WHERE er.code=? ORDER BY slot_number").bind(registrationCode).all()).results;
  return Response.json({ ...registration, roster });
}
