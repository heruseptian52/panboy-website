import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
import {ensureRosterTables} from "../../../../../lib/event-rosters";

export async function DELETE(request: Request) {
  if (!await requirePermission(request, "events")) {
    return Response.json({error: "Tidak diizinkan."}, {status: 403});
  }
  const params = new URL(request.url).searchParams;
  const eventId = Number(params.get("eventId"));
  const entryId = Number(params.get("entryId"));
  if (![eventId, entryId].every(id => Number.isSafeInteger(id) && id > 0)) {
    return Response.json({error: "Pilih event dan team yang akan dihapus."}, {status: 400});
  }
  await ensureRosterTables();
  const deleted = await env.DB.prepare("DELETE FROM roster_entries WHERE event_id=? AND id=? RETURNING logo_key AS logoKey")
    .bind(eventId, entryId).first<{logoKey:string}>();
  if (!deleted) return Response.json({error: "Data team sudah dihapus atau tidak ditemukan di event ini."}, {status: 404});
  await env.DB.prepare("UPDATE roster_invitations SET entry_id=NULL WHERE roster_event_id=? AND entry_id=?").bind(eventId,entryId).run();
  if (deleted.logoKey?.startsWith(`roster-logos/${eventId}/`)) {
    try {
      const shared = await env.DB.prepare("SELECT id FROM roster_entries WHERE logo_key=? LIMIT 1").bind(deleted.logoKey).first();
      if (!shared) {
        await env.DB.prepare("DELETE FROM roster_uploads WHERE event_id=? AND object_key=? AND consumed=1").bind(eventId, deleted.logoKey).run();
        await env.BUCKET.delete(deleted.logoKey);
      }
    } catch {
      return Response.json({ok:true, warning:"Data team sudah dihapus. File logo lama belum dapat dibersihkan."});
    }
  }
  return Response.json({ok:true});
}
