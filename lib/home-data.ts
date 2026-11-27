import { env } from "cloudflare:workers";
import { ensureEventsTable, eventHasClosed, type EventRecord } from "./events";
import type { Partner } from "./shop";
import { prepareCommunityMembers, type CommunityMember } from "./members";
import { defaults, bannerVisibility, type Settings } from "./settings";
import { featureDefaults, type FeatureFlags } from "./features";
import { ensureRosterTables } from "./event-rosters";

export async function getHomeData() {
  const [,,membersQuery] = await Promise.all([ensureEventsTable(), ensureRosterTables(), prepareCommunityMembers(true, false, true)]);
  const [eventRows, partnerRows, settingRows, featureRows, memberRows] = await env.DB.batch([
    env.DB.prepare("SELECT e.id,e.title,e.event_date AS eventDate,e.start_date AS startDate,e.end_date AS endDate,e.prizepool,e.registration_fee AS registrationFee,e.image_url AS imageUrl,e.category,e.status,e.whatsapp,e.event_mode AS eventMode,e.registration_type AS registrationType,e.city,e.province,e.address,e.max_slots AS maxSlots,(SELECT COUNT(*) FROM event_registrations r WHERE r.event_id=e.id AND r.payment_status='paid') AS paidSlots,(SELECT re.max_slots FROM roster_events re WHERE re.site_event_id=e.id AND re.show_slots=1 AND re.max_slots>0) AS rosterMaxSlots,(SELECT COUNT(*) FROM roster_entries entry JOIN roster_events re ON re.id=entry.event_id WHERE re.site_event_id=e.id AND re.show_slots=1 AND re.max_slots>0) AS rosterRegistered,e.sort_order AS sortOrder FROM events e WHERE e.deleted_at='' AND (e.end_date='' OR e.end_date>=date('now','+8 hours')) AND UPPER(TRIM(e.status)) NOT IN ('SELESAI','CLOSED','CLOSE') ORDER BY e.start_date ASC,e.sort_order ASC,e.id DESC"),
    env.DB.prepare("SELECT id,name,logo_url AS logoUrl,link_url AS linkUrl,sort_order AS sortOrder FROM partners ORDER BY sort_order,id"),
    env.DB.prepare("SELECT key,value FROM site_settings WHERE key NOT LIKE 'feature.%'"),
    env.DB.prepare("SELECT key,value FROM site_settings WHERE key LIKE 'feature.%'"),
    membersQuery,
  ]);
  const settings = { ...defaults } as Settings;
  for (const row of settingRows.results as Array<{ key: keyof Settings; value: string }>)
    if (row.key in settings) settings[row.key] = row.value as never;
  settings.premiumAdPhotoEnabled = bannerVisibility(settings);
  const features = { ...featureDefaults } as FeatureFlags;
  for (const row of featureRows.results as Array<{ key: string; value: string }>) {
    const key = row.key.slice(8) as keyof FeatureFlags;
    if (key in features) features[key] = row.value === "true";
  }
  return {
    events: (eventRows.results as unknown as EventRecord[]).filter(event=>!eventHasClosed(event)),
    partners: partnerRows.results as unknown as Partner[],
    settings,
    features,
    members: (memberRows.results as unknown as CommunityMember[]).map((member) => ({ ...member, active: Boolean(member.active) })),
  };
}
