import { env } from "cloudflare:workers";

export type EventSubmission = {
  id: number; title: string; organizer: string; whatsapp: string; startDate: string; endDate: string;
  prizepool: string; registrationFee: string; imageUrl: string; eventMode: string;
  city: string; province: string; address: string; notes: string; status: string;
  eventId: number; createdAt: string; reviewedAt: string; reviewedBy: string; rejectionReason: string;
};

export async function ensureEventSubmissions() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS event_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, organizer TEXT NOT NULL,
    whatsapp TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    prizepool TEXT NOT NULL DEFAULT '', registration_fee TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL, event_mode TEXT NOT NULL DEFAULT 'Online',
    city TEXT NOT NULL DEFAULT '', province TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING',
    event_id INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
    reviewed_at TEXT NOT NULL DEFAULT '', reviewed_by TEXT NOT NULL DEFAULT '', rejection_reason TEXT NOT NULL DEFAULT ''
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS event_submissions_status_idx ON event_submissions(status,created_at)").run();
}

export const submissionColumns = `id,title,organizer,whatsapp,start_date AS startDate,end_date AS endDate,
  prizepool,registration_fee AS registrationFee,image_url AS imageUrl,event_mode AS eventMode,
  city,province,address,notes,status,event_id AS eventId,created_at AS createdAt,
  reviewed_at AS reviewedAt,reviewed_by AS reviewedBy,rejection_reason AS rejectionReason`;
