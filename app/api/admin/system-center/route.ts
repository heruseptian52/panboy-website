import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";

export async function GET(request: Request) {
  const response = (body: unknown, status = 200) => Response.json(body, {status, headers: {"Cache-Control": "private, no-store"}});
  if (!(await requestAdmin(request))?.isOwner) return response({error: "Khusus Admin Utama"}, 403);
  const params = new URL(request.url).searchParams;
  try {
    if (params.get("part") === "health") {
      async function check(name: string, run: () => Promise<unknown>) {
        const start = Date.now();
        try { await run(); const ms = Date.now() - start; return {name, ms, status: ms > 1500 ? "Lambat" : "Normal"}; }
        catch { return {name, ms: Date.now() - start, status: "Bermasalah"}; }
      }
      return response({checks: await Promise.all([
        check("Database", () => env.DB.prepare("SELECT 1").first()),
        check("Storage", () => env.BUCKET.list({limit:1}))
      ]), checked: new Date().toISOString()});
    }
    if (params.get("part") === "inventory") {
      const page = await env.BUCKET.list({limit:100,cursor:params.get("cursor") || undefined});
      return response({files: page.objects.map(file=>({key:file.key,size:file.size,uploaded:file.uploaded})),next:page.truncated?page.cursor:null});
    }
    if (params.get("part") === "storage") {
      const page = await env.BUCKET.list({limit: 250, cursor: params.get("cursor") || undefined});
      const groups: Record<string,{count:number;bytes:number}> = {};
      for (const file of page.objects) {
        const prefix = (file.key || "").split("/")[0];
        const category = prefix.includes("temp") || prefix.includes("tmp") ? "File sementara" :
          ["team-logos","roster-logos"].includes(prefix) ? "Logo team" :
          prefix === "member-payment-proofs" ? "Bukti pembayaran" :
          prefix.startsWith("blacklist") ? "Bukti blacklist" :
          prefix.startsWith("showcase") ? "Panboy Showcase" :
          prefix.startsWith("market") ? "Esports Market" :
          prefix === "event-submissions" ? "Poster pengajuan event" :
          "File lainnya";
        const group = groups[category] ??= {count:0, bytes:0};
        group.count++; group.bytes += file.size;
      }
      return response({count: page.objects.length, bytes: page.objects.reduce((n, file) => n + file.size, 0), groups, next: page.truncated ? page.cursor : null});
    }
    const catalog = await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name").all<{name:string}>();
    const offset = Number(params.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return response({error:"Halaman tidak valid"},400);
    const names = catalog.results.slice(offset, offset + 8);
    const rows = await Promise.all(names.map(async ({name}) => ({
      name, count: await env.DB.prepare('SELECT COUNT(*) AS n FROM "' + name.replaceAll('"','""') + '"').first<number>("n")
    })));
    return response({rows, bytes: catalog.meta.size_after ?? null, next: offset + rows.length < catalog.results.length ? offset + rows.length : null});
  } catch {
    return response({error:"Pemeriksaan gagal. Silakan coba lagi."},503);
  }
}
