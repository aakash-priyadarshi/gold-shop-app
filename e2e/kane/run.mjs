/**
 * Optional Kane CLI (TestMu AI) runner for Orivraa UI checks.
 * Money/tax/stock remain covered by Jest + api-core-pipeline.mjs.
 *
 * Exit 0 = Kane run succeeded
 * Exit 1 = Kane run failed
 * Exit 2 = Kane CLI not installed / not authenticated (skip, do not fail CI)
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUITES = {
  public: "objectives/public-smoke.txt",
  seller: "objectives/seller-readonly.txt",
};

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const suite = argValue("--suite", process.env.KANE_SUITE || "public");
const objectiveRel = SUITES[suite];
if (!objectiveRel) {
  console.error(`Unknown suite "${suite}". Use: ${Object.keys(SUITES).join(", ")}`);
  process.exit(2);
}

const objectivePath = resolve(__dirname, objectiveRel);
const contextPath = resolve(__dirname, "context.md");
const objective = readFileSync(objectivePath, "utf8").trim();
const baseUrl = process.env.KANE_BASE_URL || "https://www.orivraa.com";
const timeout = String(process.env.KANE_TIMEOUT || "180");
const headed = process.env.KANE_HEADED === "1";
const isWin = process.platform === "win32";

function run(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    shell: isWin,
    env: process.env,
  });
}

function resolveKane() {
  const bin = isWin ? "kane-cli.cmd" : "kane-cli";
  const version = run(bin, ["--version"]);
  if (version.status === 0) {
    return { cmd: bin, prefix: [] };
  }
  const npx = isWin ? "npx.cmd" : "npx";
  const probe = run(npx, ["--yes", "@testmuai/kane-cli", "--version"]);
  if (probe.status === 0) {
    return { cmd: npx, prefix: ["--yes", "@testmuai/kane-cli"] };
  }
  return null;
}

const kane = resolveKane();
if (!kane) {
  console.log("Kane CLI is not installed. Optional UI layer — skipping.");
  console.log("Install: npm install -g @testmuai/kane-cli");
  console.log("Then:    kane-cli auth");
  console.log("Docs:    https://www.testmuai.com/support/docs/kane-cli-introduction/");
  process.exit(2);
}

if (!existsSync(contextPath)) {
  console.error("Missing Kane context file:", contextPath);
  process.exit(2);
}

const args = [
  ...kane.prefix,
  "run",
  objective,
  "--url",
  baseUrl,
  "--agent",
  "--timeout",
  timeout,
  "--local-context",
  contextPath,
];
if (!headed) args.push("--headless");

console.log(`Kane suite=${suite} url=${baseUrl}`);
console.log(`Objective: ${objectivePath}`);

const result = run(kane.cmd, args);
const stdout = `${result.stdout || ""}${result.stderr || ""}`;
if (stdout) process.stdout.write(stdout);

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}

const lines = stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

let runEnd = null;
for (const line of lines) {
  if (!line.startsWith("{")) continue;
  try {
    const event = JSON.parse(line);
    if (event?.event === "run_end" || event?.type === "run_end") {
      runEnd = event;
    }
    if (event?.status && event?.summary) runEnd = event;
  } catch {
    /* not NDJSON */
  }
}

if (runEnd) {
  const status = String(runEnd.status || runEnd.result || "").toLowerCase();
  console.log("Kane run_end:", JSON.stringify(runEnd.summary || runEnd, null, 2));
  process.exit(status === "passed" || status === "success" || status === "ok" ? 0 : 1);
}

if (result.status === 0) {
  process.exit(0);
}

const combined = stdout.toLowerCase();
if (
  combined.includes("not authenticated") ||
  combined.includes("please login") ||
  combined.includes("unauthorized")
) {
  console.log("Kane CLI needs `kane-cli auth`. Skipping (exit 2).");
  process.exit(2);
}

process.exit(result.status == null ? 1 : result.status);
