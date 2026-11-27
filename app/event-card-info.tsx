import type { EventRecord } from "../lib/events";

function InfoIcon({ kind }: { kind: "prize" | "fee" | "period" | "mode" }) {
  const paths = {
    prize: <><path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4M12 15v4m-4 2h8" /></>,
    fee: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 9V5a2 2 0 0 1 2-2h13m-2 9h5v4h-5a2 2 0 0 1 0-4z" /></>,
    period: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-12 5h6" /></>,
    mode: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8m-4-3v3m-5-9h10" /></>,
  };
  return <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export default function EventCardInfo({ event, formatRupiah }: { event: EventRecord; formatRupiah: (value: string) => string }) {
  const offline = event.eventMode.toLowerCase() === "offline";
  const location = offline ? [event.city, event.province].filter(Boolean).join(", ") : `Event ${event.eventMode}`;
  const showFee = event.status === "OPEN REGISTRATION" || event.status === "REGISTRATION";
  return <div className="event-info">
    <small className="event-category">{event.category}</small>
    <h3>{event.title}</h3>
    {Number(event.rosterMaxSlots) > 0 && <div className="event-roster-slots" aria-label={`${event.rosterRegistered ?? 0} dari ${event.rosterMaxSlots} slot tim terdaftar`}>
      <span>TIM TERDAFTAR <small> / TOTAL SLOT</small></span>
      <strong>{event.rosterRegistered ?? 0}<i> / {event.rosterMaxSlots}</i></strong>
    </div>}
    <div className="event-details">
      <p><InfoIcon kind="prize"/><span>PRIZEPOOL<strong>{formatRupiah(event.prizepool)}</strong></span></p>
      {showFee && <p><InfoIcon kind="fee"/><span>FEE REGISTRASI<strong>{formatRupiah(event.registrationFee)}</strong></span></p>}
      <p className="event-period"><InfoIcon kind="period"/><span>PERIODE EVENT<strong>{event.eventDate}</strong></span></p>
      <p className="event-mode-detail"><InfoIcon kind="mode"/><span>STATUS EVENT<strong className="event-mini-badge">{offline ? "EVENT OFFLINE" : `EVENT ${event.eventMode.toUpperCase()}`}</strong></span></p>
    </div>
    <div className="event-info-footer"><p className="event-location">⌖ {location}{offline && event.address ? ` — ${event.address}` : ""}</p><span className="arrow" aria-hidden="true">→</span></div>
  </div>;
}
