import { env } from "cloudflare:workers";
import { requestAdmin } from "../../../../lib/admin-auth";

export async function GET(request: Request) {
  const response = (body: unknown, status = 200) => Response.json(body, {status, headers: {"Cache-Control": "private, no-store"}});
  if (!(await requestAdmin(request))?.isOwner) return response({error: "Khusus Admin Utama"}, 403);
  const params = new URL(request.url).searchParams;
  try {
    if (params.get("part") === "storage") {
      const page = await env.BUCKET.list({limit: 250, cursor: params.get("cursor") || undefined});
      return response({count: page.objects.length, bytes: page.objects.reduce((n, file) => n + file.size, 0), next: page.truncated ? page.cursor : null});
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
