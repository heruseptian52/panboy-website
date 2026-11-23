export type EventItem = {
  id: string;
  name: string;
  category: "Event Panboy" | "Event Premium" | "Event Official";
  mode: "Online" | "Offline";
  prizepool: number;
  fee: number;
  period: string;
  status: "Open Regist" | "Regist" | "Close";
  /** Last day of registration/event in YYYY-MM-DD format (WITA). */
  endDate?: string;
  city?: string;
  /** Full HTTPS URL for an existing public registration form, if configured. */
  registrationUrl?: string;
  adminWa?: string;
};

export const events: EventItem[] = [
  { id:"ult-s5", name:"Ultimate Collab Tournament S5", category:"Event Panboy", mode:"Online", prizepool:3000000, fee:30000, period:"10–12 September 2026", endDate:"2026-09-12", status:"Open Regist" },
  { id:"vexen-opening", name:"Vexen Esport Grand Opening", category:"Event Premium", mode:"Online", prizepool:2000000, fee:0, period:"22 Agustus 2026", endDate:"2026-08-22", status:"Close" },
  { id:"erafone-palu", name:"Erafone S1 Palu", category:"Event Official", mode:"Offline", prizepool:2000000, fee:0, period:"2 Agustus 2026", endDate:"2026-08-02", status:"Close", city:"Palu" }
];

export function getEventStatus(event: EventItem, now: Date = new Date()): EventItem["status"] {
  if (event.status === "Close") return "Close";

  // Interpret the event date in Central Indonesia Time, not in the server timezone.
  if (event.endDate && /^\d{4}-\d{2}-\d{2}$/.test(event.endDate)) {
    const closingTime = new Date(event.endDate + "T23:59:59+08:00");
    if (!Number.isNaN(closingTime.getTime()) && now.getTime() > closingTime.getTime()) {
      return "Close";
    }
  }
  return event.status;
}

/** Returns no destination if registration is closed or not configured. */
export function getRegistrationHref(event: EventItem, now: Date = new Date()): string | null {
  if (getEventStatus(event, now) === "Close") return null;

  if (event.registrationUrl) {
    try {
      const url = new URL(event.registrationUrl);
      if (url.protocol === "https:" && url.username === "" && url.password === "") {
        return url.toString();
      }
    } catch {
      // Invalid admin-provided URL: do not render an unsafe link.
    }
  }

  // Disallow invalid / placeholder WhatsApp numbers (the old sample was 6280000000000).
  const whatsapp = event.adminWa?.replace(/\D/g, "") ?? "";
  if (!/^62[1-9]\d{7,12}$/.test(whatsapp) || /^6280+$/.test(whatsapp)) return null;

  return "https://wa.me/" + whatsapp + "?text=" +
    encodeURIComponent("Halo admin, saya mau daftar " + event.name);
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n);
