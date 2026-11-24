import {env} from "cloudflare:workers";import {requestAdmin} from "../../../../lib/admin-auth";import {defaults,ensureSettings,getSettings} from "../../../../lib/settings";
export async function GET(r:Request){if(!(await requestAdmin(r))?.appearance)return Response.json({error:"Tidak diizinkan"},{status:403});return Response.json(await getSettings())}
export async function PUT(r:Request){const a=await requestAdmin(r);if(!a?.appearance&&!a?.topup)return Response.json({error:"Tidak diizinkan"},{status:403});await ensureSettings();const b=await r.json() as Record<string,unknown>,now=new Date().toISOString();const writes = Object.keys(defaults)
  .filter(key => typeof b[key] === "string" && (a.appearance || (a.topup && ["topupMarkupJson","topupInputRequirementsJson"].includes(key))))
  .map(key => {
    const value = key === "premiumAdPhotoEnabled" && b[key] === "false" ? "hidden" : String(b[key]);
    return env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value,now);
  });
  if (writes.length) await env.DB.batch(writes);
  return Response.json({ok:true});
}
