const cleanupKey = "event_auto_purge_last_date";

function samarindaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function purgeExpiredEvents(db: D1Database) {
  const today = samarindaDate();
  const lastRun = await db
    .prepare("SELECT value FROM site_settings WHERE key=?")
    .bind(cleanupKey)
    .first<{ value: string }>();
  if (lastRun?.value === today) return 0;

  const expired = await db
    .prepare(
      "SELECT id FROM events WHERE end_date!='' AND end_date<date('now','+8 hours','-14 days')",
    )
    .all<{ id: number }>();
  const ids = expired.results.map((event) => Number(event.id)).filter(Boolean);
  const now = new Date().toISOString();

  if (!ids.length) {
    await db
      .prepare(
        "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      )
      .bind(cleanupKey, today, now)
      .run();
    return 0;
  }

  const marks = ids.map(() => "?").join(",");
  const registrations = `SELECT id FROM event_registrations WHERE event_id IN (${marks})`;
  const stages = `SELECT id FROM tournament_stages WHERE event_id IN (${marks})`;
  const groups = `SELECT id FROM tournament_groups WHERE stage_id IN (${stages})`;
  const matches = `SELECT id FROM tournament_matches WHERE stage_id IN (${stages})`;

  await db.batch([
    db.prepare(`DELETE FROM match_results WHERE registration_id IN (${registrations}) OR match_id IN (${matches})`).bind(...ids, ...ids),
    db.prepare(`DELETE FROM tournament_penalties WHERE registration_id IN (${registrations}) OR stage_id IN (${stages})`).bind(...ids, ...ids),
    db.prepare(`DELETE FROM point_adjustments WHERE registration_id IN (${registrations}) OR stage_id IN (${stages})`).bind(...ids, ...ids),
    db.prepare(`DELETE FROM check_ins WHERE registration_id IN (${registrations}) OR stage_id IN (${stages})`).bind(...ids, ...ids),
    db.prepare(`DELETE FROM group_teams WHERE registration_id IN (${registrations}) OR group_id IN (${groups})`).bind(...ids, ...ids),
    db.prepare(`DELETE FROM registration_rosters WHERE registration_id IN (${registrations})`).bind(...ids),
    db.prepare(`DELETE FROM tournament_matches WHERE stage_id IN (${stages})`).bind(...ids),
    db.prepare(`DELETE FROM tournament_groups WHERE stage_id IN (${stages})`).bind(...ids),
    db.prepare(`DELETE FROM event_point_systems WHERE event_id IN (${marks})`).bind(...ids),
    db.prepare(`DELETE FROM tournament_stages WHERE event_id IN (${marks})`).bind(...ids),
    db.prepare(`DELETE FROM event_registrations WHERE event_id IN (${marks})`).bind(...ids),
    db.prepare(`DELETE FROM events WHERE id IN (${marks})`).bind(...ids),
    db.prepare(
      "INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    ).bind(cleanupKey, today, now),
  ]);

  return ids.length;
}
