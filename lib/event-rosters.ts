import { env } from "cloudflare:workers";
export async function ensureRosterTables() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS roster_events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, deadline TEXT NOT NULL, stopped INTEGER NOT NULL DEFAULT 0, max_players INTEGER NOT NULL DEFAULT 8, created_at TEXT NOT NULL)").run();
  const columns = await env.DB.prepare("PRAGMA table_info(roster_events)").all<{name:string}>();
  if(!columns.results.some(column=>column.name==="max_players")){
    try{await env.DB.prepare("ALTER TABLE roster_events ADD COLUMN max_players INTEGER NOT NULL DEFAULT 8").run()}catch(error){
      const check=await env.DB.prepare("PRAGMA table_info(roster_events)").all<{name:string}>();
      if(!check.results.some(column=>column.name==="max_players"))throw error;
    }
  }
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS roster_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, team_name TEXT NOT NULL, players_json TEXT NOT NULL, edit_token_hash TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(event_id, team_name))").run();
  for (const [table, column, fallback] of [
    ["roster_events","options_json","{}"], ["roster_entries","zones_json","[]"]
  ]) {
    const hasColumn = async () => (await env.DB.prepare(`PRAGMA table_info(${table})`).all<{name:string}>()).results.some(row => row.name === column);
    if (!await hasColumn()) {
      try { await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT '${fallback}'`).run(); }
      catch (error) { if (!await hasColumn()) throw error; }
    }
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_roster_entries_event ON roster_entries(event_id)").run();
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_entries_event_team_nocase ON roster_entries(event_id, team_name COLLATE NOCASE)").run();
  const columnsEvent = new Set((await env.DB.prepare("PRAGMA table_info(roster_events)").all<{name:string}>()).results.map(x=>x.name));
  for (const [name,definition] of [["site_event_id","INTEGER"],["max_slots","INTEGER NOT NULL DEFAULT 0"],["show_slots","INTEGER NOT NULL DEFAULT 0"]] as const) {
    if (!columnsEvent.has(name)) {
      try { await env.DB.prepare(`ALTER TABLE roster_events ADD COLUMN ${name} ${definition}`).run(); }
      catch (error) { if (!(await env.DB.prepare("PRAGMA table_info(roster_events)").all<{name:string}>()).results.some(x=>x.name===name)) throw error; }
    }
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_site_event ON roster_events(site_event_id) WHERE site_event_id IS NOT NULL").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS roster_invitations (id INTEGER PRIMARY KEY AUTOINCREMENT, roster_event_id INTEGER NOT NULL, team_name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, entry_id INTEGER, revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_roster_invitations_event ON roster_invitations(roster_event_id)").run();
  if (!(await env.DB.prepare("PRAGMA table_info(roster_entries)").all<{name:string}>()).results.some(x=>x.name==="invitation_id")) {
    try { await env.DB.prepare("ALTER TABLE roster_entries ADD COLUMN invitation_id INTEGER").run(); }
    catch (error) { if (!(await env.DB.prepare("PRAGMA table_info(roster_entries)").all<{name:string}>()).results.some(x=>x.name==="invitation_id")) throw error; }
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_entry_invitation ON roster_entries(invitation_id) WHERE invitation_id IS NOT NULL").run();
}
export async function hashRosterToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function normalizePlayers(input: unknown, maxPlayers = 8) {
  if (!Array.isArray(input) || input.length < 1 || input.length > maxPlayers) throw new Error(`Isi maksimal ${maxPlayers} player.`);
  const players = input.map((value: unknown) => {
    const row = value as Record<string,unknown>;
    const nick = String(row?.nick || "").trim();
    const playerId = String(row?.playerId || "").trim();
    if (!nick || nick.length > 50 || !/^\d{5,20}$/.test(playerId)) throw new Error("Isi nick dan ID angka 5–20 digit untuk setiap pemain.");
    return {nick, playerId};
  });
  if (new Set(players.map(p=>p.playerId)).size!==players.length) throw new Error("ID pemain tidak boleh sama dalam satu team.");
  return players;
}

export async function recoveryToken(eventId: number, entryId: number, originalHash: string) {
  return 'r.' + entryId + '.' + await hashRosterToken('panboy-roster-recovery:' + eventId + ':' + entryId + ':' + originalHash);
}

export async function resolveRosterHash(eventId: number, token: string) {
  if (!token.startsWith('r.')) return hashRosterToken(token);
  const match = /^r\.(\d+)\.[a-f0-9]{64}$/.exec(token);
  if (!match) return "";
  const entryId = Number(match[1]);
  const entry = await env.DB.prepare("SELECT edit_token_hash AS hash FROM roster_entries WHERE event_id=? AND id=?")
    .bind(eventId, entryId).first<{hash: string}>();
  return entry && await recoveryToken(eventId, entryId, entry.hash) === token ? entry.hash : "";
}
