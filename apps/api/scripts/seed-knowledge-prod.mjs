/**
 * Seed knowledge chunks against Railway prod using the public DB URL.
 * Does not print credentials.
 *
 *   node scripts/seed-knowledge-prod.mjs
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(root, "..");

function railwayJson(service) {
  const r = spawnSync(
    "railway",
    ["variables", "-s", service, "--json"],
    { encoding: "utf8", cwd: apiRoot, shell: true },
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || "railway variables failed");
    process.exit(r.status || 1);
  }
  return JSON.parse(r.stdout);
}

const pg = railwayJson("Postgres");
const api = railwayJson("@gold-shop/api");

const databaseUrl = pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL;
const gemini = api.GEMINI_API_KEY;

if (!databaseUrl) {
  console.error("Missing DATABASE_PUBLIC_URL on Postgres service");
  process.exit(1);
}
if (!gemini) {
  console.error("Missing GEMINI_API_KEY on @gold-shop/api");
  process.exit(1);
}

try {
  console.log("DB host:", new URL(databaseUrl).hostname);
} catch {
  console.error("Invalid database URL");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_DATABASE_URL: databaseUrl,
  GEMINI_API_KEY: gemini,
};

console.log("Seeding knowledge chunks…");
const result = spawnSync(
  "npx.cmd",
  ["ts-node", "-P", "tsconfig.json", "prisma/seeds/knowledge-chunks.ts"],
  { cwd: apiRoot, env, stdio: "inherit", shell: true },
);
process.exit(result.status ?? 1);
