# Esports Market & upload improvements
- Public: /esports-market; submit a player or recruitment post, consent, private edit token, review status.
- Admin: Team & Player > Esports Market; owner can grant the independent market permission in Akses Admin. Member-only submission verifies active membership using stored team/WhatsApp; public approved listings remain viewable.
- Publication edits are drafts; the last approved publication remains visible until the new version is approved. Hide/delete suppresses publication without deleting R2 objects.
- Roster Checker: Data Player Event > selected event. Review decisions do not delete teams or players; approved blacklist uses existing blacklist_players.
- Group randomizer: keep saved groups, move a team, detect clan prefix collision, export XLSX, print/Save PDF. New entries are pending until redraw.
- Upload: existing image endpoints use init/chunk/complete even for small images; original query params are preserved. Market images max 10 MB, videos MP4/WebM max 25 MB; existing upload limits preserved. Market media is gated by live publication, authorized admin, or private draft token. Retry/cancel where chunk workflow supports it. Image transparency is preserved.
- Additive D1 migration: sql/esports_market_2026_11_26.sql; lazy CREATE TABLE IF NOT EXISTS also runs in affected routes. No reset or rewrite of existing database.
- Automated checks: node --test tests/*.test.mjs, npm run build. Production admin credentials are not required for fixture tests.
