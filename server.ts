// Production static server for the built SPA. Serves dist/ with correct
// content types, SPA fallback for client-side routes, and cache headers that
// keep the service worker and HTML fresh while long-caching hashed assets.
import { file, serve } from "bun";

const DIST = new URL("./dist/", import.meta.url);
const DIST_PATH = new URL(".", DIST).pathname;
const port = Number(process.env.PORT ?? 3000);

function noCache(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.endsWith("index.html") ||
    pathname === "/sw.js" ||
    pathname === "/registerSW.js" ||
    pathname.endsWith(".webmanifest")
  );
}

serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let target = new URL(rel, DIST);

    // Guard against path traversal escaping the dist directory.
    if (!target.pathname.startsWith(DIST_PATH)) {
      return new Response("Forbidden", { status: 403 });
    }

    let f = file(target);
    if (!(await f.exists())) {
      // Real asset request (has an extension) that's missing → 404.
      if (/\.[a-z0-9]+$/i.test(pathname)) return new Response("Not found", { status: 404 });
      // Otherwise it's a client-side route → serve the app shell.
      target = new URL("index.html", DIST);
      f = file(target);
    }

    const headers = new Headers();
    if (noCache(pathname)) headers.set("Cache-Control", "no-cache");
    else if (pathname.startsWith("/assets/"))
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(f, { headers });
  },
});

console.log(`Fourth Step Ledger serving dist/ on 0.0.0.0:${port}`);
