/**
 * generate-routes.mjs
 *
 * Runs at BUILD TIME (via `prebuild`) to scan src/app for all indexable
 * page.tsx routes and write them to src/data/generated-routes.json.
 *
 * The sitemap.ts imports that JSON so it never needs runtime filesystem access,
 * which would crash on Vercel serverless functions.
 */

import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, "../src/app");
const OUTPUT = join(__dirname, "../src/data/generated-routes.json");

const EXCLUDED_ROOT_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "cart",
  "checkout",
  "dashboard",
  "notifications",
  "orders",
  "payment",
]);

const EXCLUDED_EXACT_ROUTES = new Set(["/blog", "/robots", "/sitemap"]);

function isIgnoredDirectory(name) {
  // Skip route groups, dynamic segments, and private folders
  return name.startsWith("(") || name.startsWith("[") || name.startsWith("_");
}

function shouldIndex(route) {
  if (EXCLUDED_EXACT_ROUTES.has(route)) return false;
  const rootSegment = route.split("/").filter(Boolean)[0];
  return !rootSegment || !EXCLUDED_ROOT_SEGMENTS.has(rootSegment);
}

function collectRoutes(dir, segments = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name)) continue;
      if (segments.length === 0 && EXCLUDED_ROOT_SEGMENTS.has(entry.name)) continue;
      routes.push(...collectRoutes(join(dir, entry.name), [...segments, entry.name]));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      const route = segments.length === 0 ? "/" : `/${segments.join("/")}`;
      if (shouldIndex(route)) routes.push(route);
    }
  }

  return routes;
}

const routes = collectRoutes(APP_DIR).sort();
writeFileSync(OUTPUT, JSON.stringify(routes, null, 2) + "\n");
console.log(`[generate-routes] ${routes.length} routes -> src/data/generated-routes.json`);
