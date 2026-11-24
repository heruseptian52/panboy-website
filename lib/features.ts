import { env } from "cloudflare:workers";

export const featureDefaults = {
  featuredCarousel: true,
  eventCatalog: true,
  registrationForm: true,
  registrationWhatsapp: true,
  teamLogoUpload: true,
  registrationCheck: true,
  teamDatabase: true,
  tournamentManagement: true,
  matchCenter: true,
  topup: true,
  accountMarketplace: true,
  collaboration: true,
  partnerships: true,
  premiumAds: true,
  music: true,
  analytics: true,
  media: true,
};
export type FeatureKey = keyof typeof featureDefaults;
export type FeatureFlags = Record<FeatureKey, boolean>;
export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const rows = await env.DB.prepare("SELECT key,value FROM site_settings WHERE key LIKE 'feature.%'").all<{key:string;value:string}>();
    const flags = { ...featureDefaults } as FeatureFlags;
    for (const row of rows.results) {
      const key = row.key.slice(8) as FeatureKey;
      if (key in flags) flags[key] = row.value === "true";
    }
    return flags;
  } catch { return { ...featureDefaults }; }
}
