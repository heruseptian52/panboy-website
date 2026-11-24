import {env} from "cloudflare:workers";

export type CasterProfile={id:number;name:string;photoUrl:string;youtubeUrl:string;active:number;sortOrder:number};
export async function getCasterProfiles(onlyActive=true){
  const rows=await env.DB.prepare(`SELECT id,name,photo_url AS photoUrl,youtube_url AS youtubeUrl,active,sort_order AS sortOrder FROM caster_profiles ${onlyActive?"WHERE active=1":""} ORDER BY sort_order,id`).all<CasterProfile>();
  return rows.results;
}
