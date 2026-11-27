import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { ensureEventsTable, normalizeWhatsapp } from "../../../lib/events";
import RegistrationForm from "./registration-form";
import { getFeatureFlags } from "../../../lib/features";
import type { Metadata } from "next";
import {ensureRosterTables} from "../../../lib/event-rosters";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return { robots: { index: false } };
  await ensureEventsTable();
  const event = await env.DB.prepare("SELECT title,event_date AS eventDate,prizepool,registration_fee AS registrationFee,image_url AS imageUrl,status,event_mode AS eventMode FROM events WHERE id=? AND deleted_at=''").bind(id).first<Record<string, string>>();
  if (!event) return { robots: { index: false } };
  const name = String(event.title || "Event PUBG Mobile").trim();
  const open = ["OPEN REGISTRATION", "REGISTRATION", "FREE REGISTRATION"].includes(String(event.status).toUpperCase());
  const details = [event.eventDate && `Jadwal ${event.eventDate}`, event.prizepool && `prize pool ${event.prizepool}`, event.registrationFee && `biaya registrasi ${event.registrationFee}`].filter(Boolean).join(" · ");
  const description = `${name} di Panboy Community. ${details ? `${details}. ` : ""}${open ? "Pendaftaran dibuka. Lihat detail dan daftarkan team kamu." : "Lihat informasi dan status event terbaru."}`;
  const url = `https://panboycommunity.my.id/event/${id}`;
  return {
    title: { absolute: `${name} | Event PUBG Mobile - Panboy Community` },
    description,
    alternates: { canonical: url },
    openGraph: { title: name, description, url, type: "website", images: event.imageUrl ? [{ url: event.imageUrl, alt: name }] : undefined },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  await Promise.all([ensureEventsTable(),ensureRosterTables()]);
  const [event,features] = await Promise.all([env.DB.prepare("SELECT id,title,event_date AS eventDate,start_date AS startDate,prizepool,registration_fee AS registrationFee,image_url AS imageUrl,category,status,whatsapp,event_mode AS eventMode,registration_type AS registrationType,city,province,address,max_slots AS maxSlots,(SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=events.id AND r.payment_status='paid') AS paidSlots FROM events WHERE id=? AND deleted_at=''").bind(id).first<Record<string, string|number>>(),getFeatureFlags()]);
  if (!event) notFound();
  const slot=await env.DB.prepare("SELECT max_slots AS maxSlots,show_slots AS showSlots,(SELECT COUNT(*) FROM roster_entries r WHERE r.event_id=re.id) AS registered FROM roster_events re WHERE site_event_id=? LIMIT 1").bind(id).first<{maxSlots:number;showSlots:number;registered:number}>();
  const startDate=String(event.startDate||""),expired=Boolean(startDate&&Date.now()>=new Date(`${startDate}T19:00:00+07:00`).getTime());
  const internal = event.registrationType === "INTERNAL";
  const open = !internal&&!expired&&["OPEN REGISTRATION","REGISTRATION","FREE REGISTRATION"].includes(String(event.status).toUpperCase());
  return <main className="event-detail-page"><header className="detail-header"><a href="/">← KEMBALI</a><img src="/panboy-menu-logo.png" alt="Panboy"/><div>{features.matchCenter&&<a href={`/event/${id}/match-center`}>MATCH CENTER</a>}{features.registrationCheck&&<a href="/cek-pendaftaran">CEK PENDAFTARAN</a>}</div></header><section className="detail-hero"><div className="detail-poster"><img src={String(event.imageUrl)} alt={String(event.title)}/><span>{internal ? "EVENT INTERNAL" : String(event.status)}</span></div><div className="detail-copy"><small>{String(event.category)} · {String(event.eventMode)}</small><h1>{String(event.title)}</h1><div className="detail-stats"><p><span>PERIODE</span><strong>{String(event.eventDate)}</strong></p><p><span>PRIZEPOOL</span><strong>{String(event.prizepool) || "Hubungi Admin"}</strong></p><p><span>FEE REGISTRASI</span><strong>{String(event.registrationFee) || "Hubungi Admin"}</strong></p>{!!slot?.showSlots&&<p><span>TEAM TERDAFTAR / SLOT</span><strong>{slot.registered}/{slot.maxSlots}</strong></p>}</div>{event.eventMode === "Offline" && <p className="detail-address">⌖ {[event.address,event.city,event.province].filter(Boolean).join(", ")}</p>}</div></section>{open&&(features.registrationForm||features.registrationWhatsapp) ? <section className="detail-registration"><div className="section-heading"><small>REGISTRASI RESMI</small><h2>DAFTARKAN <em>TEAM</em></h2><p>Pendaftaran saat ini dilakukan langsung melalui WhatsApp admin.</p></div><RegistrationForm eventId={Number(event.id)} eventTitle={String(event.title)} whatsapp={normalizeWhatsapp(String(event.whatsapp))} allowForm={false} allowWhatsapp={features.registrationWhatsapp} allowLogoUpload={features.teamLogoUpload}/></section> : <section className="registration-closed"><h2>PENDAFTARAN TIDAK TERSEDIA</h2><p>{internal ? "Event internal. Hanya team atau klan penyelenggara yang dapat bermain; pendaftaran publik ditutup." : "Registrasi sedang dinonaktifkan oleh admin."}</p></section>}</main>;
}
