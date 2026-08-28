import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const SCAN_ROOTS = [
  ".github",
  "apps/web",
  "apps/api",
  "apps/desktop",
  "cloudflare-worker",
  "scripts",
];
const ROOT_FILE_RE = /^(?:Dockerfile(?:\..*)?|railway(?:\..*)?|\.env(?:\..*)?)$/i;
const SCANNABLE_EXTENSIONS = new Set([
  ".cjs",
  ".env",
  ".js",
  ".json",
  ".mjs",
  ".ps1",
  ".sh",
  ".toml",
  ".yml",
  ".yaml",
]);

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(?:\/\/|#)/.test(line)) return "";
      // Only remove comments introduced after whitespace so URLs and strings
      // containing `//` remain intact.
      return line.replace(/\s+\/\/.*$/, "");
    })
    .join("\n");
}

export function findViolations(text, file = "configuration") {
  const source = stripComments(text);
  const violations = [];

  for (const match of source.matchAll(/\bcacheComponents\s*(?::|=)\s*([^,}\n;]+)/gi)) {
    if (match[1].trim().toLowerCase() !== "false") {
      violations.push(`${file}: cacheComponents must remain disabled`);
      break;
    }
  }
  for (const match of source.matchAll(/\bppr\s*(?::|=)\s*([^,}\n;]+)/gi)) {
    if (match[1].trim().toLowerCase() !== "false") {
      violations.push(`${file}: experimental.ppr must remain disabled`);
      break;
    }
  }
  if (/NEXT_PRIVATE_MINIMAL_MODE\s*[:=]\s*["']?1\b/i.test(source)) {
    violations.push(`${file}: NEXT_PRIVATE_MINIMAL_MODE=1 is prohibited`);
  }

  return violations;
}

function shouldScan(filePath) {
  const name = path.basename(filePath);
  if (/(?:^(?:test|check)-next-security-config|^test[-_.]|[.-](?:test|spec)[.-])/i.test(name)) return false;
  return ROOT_FILE_RE.test(name) || SCANNABLE_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "dist", "out", "coverage"].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && shouldScan(fullPath)) files.push(fullPath);
  }
  return files;
}

export function collectViolations(root = repoRoot) {
  const files = [
    ...SCAN_ROOTS.flatMap((relative) => walk(path.join(root, relative))),
  ];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_FILE_RE.test(entry.name)) {
      files.push(path.join(root, entry.name));
    }
  }

  const violations = [];
  for (const filePath of [...new Set(files)]) {
    const source = fs.readFileSync(filePath, "utf8");
    violations.push(...findViolations(source, path.relative(root, filePath)));
  }
  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const violations = collectViolations();
  if (violations.length > 0) {
    console.error(
      "SNYK-JS-NEXT-15105315 compensating control violated:\n" +
        "PPR/cacheComponents/minimal mode must remain disabled while Next 15.5.24 is used.",
    );
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Next security configuration guard passed: PPR, cacheComponents, and minimal mode are disabled.");
  }
}
