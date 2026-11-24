/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { purgeExpiredEvents } from "../lib/event-cleanup";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve generated/static files without booting the application router. Apart
    // from being faster, this keeps asset requests independent from D1 traffic.
    if (request.method === "GET" && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_next/static/"))) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      if (asset.ok) headers.set("Cache-Control", "public, max-age=31536000, immutable");
      else headers.set("Cache-Control", "no-store");
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }

    if (request.method === "GET" && url.pathname === "/") {
      ctx.waitUntil(purgeExpiredEvents(env.DB));
    }

    const privateRegistration = /^\/data-event(?:\/|$)/.test(url.pathname);
    const privatePath = privateRegistration || url.pathname.startsWith("/admin") || url.pathname.startsWith("/api") || url.pathname.startsWith("/overlay") || url.pathname.startsWith("/pesanan") || url.pathname.startsWith("/cek-transaksi") || url.pathname === "/member/bayar";
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    if (request.method !== "GET" || response.status >= 400) return response;

    const headers = new Headers(response.headers);
    const isAsset = url.pathname.startsWith("/_next/static/") || /\.(?:css|js|woff2?|png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
    const isPrivate = privatePath;
    if (isPrivate) headers.set("Cache-Control", "private, no-store");
    else if (isAsset) headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    // HTML/RSC must be revalidated after every deployment. Caching it for a
    // minute used to leave browsers pointing at chunks from the previous build.
    else headers.set("Cache-Control", "no-cache, must-revalidate");
    if (privateRegistration) headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export default worker;
