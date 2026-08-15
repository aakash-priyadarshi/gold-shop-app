#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import ts from "typescript";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const scopes = [
  "apps/web/src/app/dashboard/shop",
  "apps/web/src/components/dashboard",
  "apps/web/src/components/shop",
];

const args = process.argv.slice(2);
const scanAll = args.includes("--all");
const baseIndex = args.indexOf("--base");
const base = baseIndex >= 0 ? args[baseIndex + 1] : null;

function walk(directory) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if ([".tsx", ".jsx"].includes(extname(path))) files.push(path);
  }
  return files;
}

function parseAddedLines(diff) {
  const changed = new Map();
  let file = null;
  let newLine = 0;
  let inHunk = false;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6);
      if (!changed.has(file)) changed.set(file, new Set());
      inHunk = false;
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      inHunk = true;
      continue;
    }

    if (!file || !inHunk || line.startsWith("\\ No newline")) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      changed.get(file).add(newLine);
      newLine += 1;
    } else if (!line.startsWith("-")) {
      newLine += 1;
    }
  }

  return changed;
}

function changedFiles() {
  const diffArgs = ["diff", "--unified=0", "--no-color"];
  if (base) diffArgs.push(`${base}...HEAD`);
  else diffArgs.push("HEAD");
  diffArgs.push("--", ...scopes);

  const diff = execFileSync("git", diffArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const changed = parseAddedLines(diff);

  if (!base) {
    const untracked = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard", "--", ...scopes],
      { cwd: repoRoot, encoding: "utf8" },
    );
    for (const file of untracked.split(/\r?\n/).filter(Boolean)) {
      changed.set(file.replaceAll("\\", "/"), null);
    }
  }

  return changed;
}

function tagName(element) {
  if (ts.isJsxElement(element)) return element.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(element)) return element.tagName.getText();
  return "";
}

function isInsideTranslation(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isJsxElement(current) &&
      ["T", "bdi", "code"].includes(tagName(current))
    )
      return true;
  }
  return false;
}

function hasReadableWords(value) {
  return /[A-Za-z]{2,}/.test(value.replace(/&[a-z]+;/gi, ""));
}

function scanFile(absolutePath, allowedLines) {
  const sourceText = readFileSync(absolutePath, "utf8");
  const source = ts.createSourceFile(
    absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];

  const report = (node, kind, value) => {
    const { line, character } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    const lineNumber = line + 1;
    if (allowedLines && !allowedLines.has(lineNumber)) return;
    violations.push({
      line: lineNumber,
      column: character + 1,
      kind,
      value: value.trim().replace(/\s+/g, " ").slice(0, 100),
    });
  };

  const visit = (node) => {
    if (
      ts.isJsxText(node) &&
      hasReadableWords(node.getText(source)) &&
      !isInsideTranslation(node)
    ) {
      report(node, "raw JSX text", node.getText(source));
    }

    if (
      ts.isJsxAttribute(node) &&
      ["placeholder", "title", "aria-label", "aria-description"].includes(
        node.name.getText(source),
      ) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      hasReadableWords(node.initializer.text)
    ) {
      report(
        node,
        `raw ${node.name.getText(source)} attribute`,
        node.initializer.text,
      );
    }

    if (ts.isCallExpression(node)) {
      const callName = node.expression.getText(source);
      if (["alert", "confirm", "prompt"].includes(callName)) {
        const first = node.arguments[0];
        if (
          first &&
          ts.isStringLiteralLike(first) &&
          hasReadableWords(first.text)
        ) {
          report(first, `raw ${callName} message`, first.text);
        }
      }

      if (callName === "toast") {
        const object = node.arguments.find(ts.isObjectLiteralExpression);
        for (const property of object?.properties ?? []) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = property.name.getText(source).replace(/["']/g, "");
          if (!["title", "description"].includes(name)) continue;
          const value = property.initializer;
          if (ts.isStringLiteralLike(value) && hasReadableWords(value.text)) {
            report(value, `raw toast ${name}`, value.text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

const selected = scanAll
  ? new Map(
      scopes.flatMap((scope) =>
        walk(resolve(repoRoot, scope)).map((file) => [
          relative(repoRoot, file).replaceAll("\\", "/"),
          null,
        ]),
      ),
    )
  : changedFiles();

const findings = [];
for (const [file, lines] of selected) {
  if (![".tsx", ".jsx"].includes(extname(file))) continue;
  if (!scopes.some((scope) => file.startsWith(`${scope}/`))) continue;
  const absolutePath = resolve(repoRoot, file);
  if (!existsSync(absolutePath)) continue;
  for (const violation of scanFile(absolutePath, lines)) {
    findings.push({ file, ...violation });
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    process.stderr.write(
      `${finding.file}:${finding.line}:${finding.column} ${finding.kind}: ${finding.value}\n`,
    );
  }
  process.stderr.write(
    `\nFound ${findings.length} newly added seller-dashboard string(s) outside <T> or t().\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Seller dashboard i18n check passed (${selected.size} changed file(s) scanned).\n`,
);
