#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scopes = [
  "apps/web/src/app/dashboard/shop",
  "apps/web/src/components/dashboard",
  "apps/web/src/components/shop",
];

// --workshop is a full audit, independent of the diff / --base. Shared workshop
// panels (including scale capture, exceptions and reports) live in these trees.
export const workshopScopes = [
  "apps/web/src/app/dashboard/shop/supply-chain",
  "apps/web/src/app/dashboard/shop/workshop",
  "apps/web/src/app/dashboard/workshop-staff",
  "apps/web/src/components/shop/workshop",
  "apps/web/src/components/shop/karigar",
  "apps/web/src/components/shop/supply-chain",
  "apps/web/src/components/FeatureGate.tsx",
];

export function isScannableFile(file) {
  const normalized = file.replaceAll("\\", "/");
  return (
    /\.[jt]sx?$/.test(normalized) &&
    !/(?:^|\/)(?:__tests__|__mocks__|__fixtures__|tests|fixtures)\//.test(
      normalized,
    ) &&
    !/\.(?:test|spec)\.[jt]sx?$/.test(normalized) &&
    !/\.d\.ts$/.test(normalized)
  );
}

function walk(directory) {
  const files = [];
  if (!existsSync(directory)) return files;
  if (statSync(directory).isFile())
    return isScannableFile(directory) ? [directory] : [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (isScannableFile(path)) files.push(path);
  }
  return files;
}

export function parseAddedLines(diff) {
  const changed = new Map();
  let file = null;
  let newLine = 0;
  let inHunk = false;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      file = line.startsWith("+++ b/") ? line.slice(6) : null;
      if (file !== null && !changed.has(file)) changed.set(file, new Set());
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

function changedFiles(repoRoot, base) {
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
      ["T", "bdi", "code", "style", "script"].includes(tagName(current))
    )
      return true;
  }
  return false;
}

function hasReadableWords(value) {
  const text = value.replace(/&(?:[a-z]+|#\d+);/gi, "").trim();
  // Symbols, quantities and technical identifiers are not translation keys.
  if (/^(?:[\d\s.,+−%/()×-]*)(?:g|kg|mg|oz|ct|mm|cm|kg\/g)?$/i.test(text))
    return false;
  if (/^(?:https?:\/\/|[^\s@]+@[^\s@]+\.)/.test(text)) return false;
  // Built-in material keys and hardware connection examples are identifiers,
  // unlike human-facing status enums (READY, REWORK, etc.).
  if (
    /^(?:goldGrains(?:995|24k)|goldBars24k|silverBullion999|COM\d+|(?:\d{1,3}\.){3}\d{1,3})$/.test(
      text,
    )
  )
    return false;
  return /[A-Za-z]{2,}/.test(text.replace(/\b(?:kg|mg|oz|ct|mm|cm)\b/g, ""));
}

const visibleAttributes = new Set([
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "aria-title",
  "alt",
]);
const displayName =
  /(?:^|[a-z_])(?:Status|State|Kind|Type|Bucket|Category|Severity|Priority|Purpose|Phase|Label|Title|Description|Heading|Message|Error|Notice|Warning|Success|Placeholder|Caption|Hint|Text)$|^(?:status|state|kind|type|bucket|category|severity|priority|purpose|phase|label|title|description|heading|message|error|notice|warning|success|placeholder|caption|hint|text)$/;

function unwrap(node) {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    node = node.expression;
  return node;
}

function referenceName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    return node.argumentExpression.text;
  }
  return "";
}

function isDisplayReference(node) {
  const name = referenceName(node);
  return (
    displayName.test(name) ||
    /(?:STATUS|STATE|KIND|TYPE|BUCKET|LABEL|TITLE|MESSAGE|ERROR)(?:S|ES)?$/.test(
      name,
    ) ||
    /(?:labels|statuses|states|kinds|types|buckets|titles|messages|errors)$/i.test(
      name,
    )
  );
}

function isTranslationCall(node) {
  return (
    ts.isCallExpression(node) &&
    /^(?:t|[\w.]+\.t)$/.test(node.expression.getText())
  );
}

// Resolve only immutable, directly translated local constants. Stop at a
// shadowing declaration/parameter rather than trusting a same-named outer t().
function isTranslatedLocal(node) {
  if (!ts.isIdentifier(node)) return false;
  const binds = (name) =>
    ts.isIdentifier(name)
      ? name.text === node.text
      : name.elements.some(
          (element) => ts.isBindingElement(element) && binds(element.name),
        );
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isBlock(parent) || ts.isSourceFile(parent)) {
      for (const statement of parent.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
          if (!binds(declaration.name)) continue;
          return (
            Boolean(statement.declarationList.flags & ts.NodeFlags.Const) &&
            ts.isIdentifier(declaration.name) &&
            Boolean(declaration.initializer) &&
            isTranslationCall(unwrap(declaration.initializer))
          );
        }
      }
    }
    if (
      ts.isFunctionLike(parent) &&
      parent.parameters.some((parameter) => binds(parameter.name))
    )
      return false;
  }
  return false;
}

// A short map parameter such as `s`/`value` still displays an enum when it comes
// from an inline enum list or a named status/label collection. Never inspect
// the key/value/onChange props just because they use that same parameter.
function isMappedLabel(node) {
  if (!ts.isIdentifier(node)) return false;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (!ts.isArrowFunction(parent) && !ts.isFunctionExpression(parent))
      continue;
    if (!parent.parameters.some((p) => p.name.getText() === node.text))
      continue;
    if (parent.parameters[0]?.name.getText() !== node.text) return false;
    const call = parent.parent;
    if (
      !ts.isCallExpression(call) ||
      !ts.isPropertyAccessExpression(call.expression) ||
      call.expression.name.text !== "map"
    )
      return false;
    const collection = unwrap(call.expression.expression);
    if (ts.isArrayLiteralExpression(collection)) {
      return (
        collection.elements.some(
          (el) => ts.isStringLiteralLike(el) && hasReadableWords(el.text),
        ) &&
        !/(?:name|id|key|sku|email|product|artisan|weight|grams|number)$/i.test(
          node.text,
        )
      );
    }
    if (
      ts.isCallExpression(collection) &&
      collection.expression.getText() === "Object.values"
    ) {
      return /(?:Status|State|Kind|Type|Bucket|Category|Severity|Priority|Purpose)$/.test(
        referenceName(collection.arguments[0]),
      );
    }
    return /(?:statuses|states|kinds|types|buckets|labels|options|headings)$/i.test(
      referenceName(collection),
    );
  }
  return false;
}

export function scanSource(
  sourceText,
  absolutePath = "fixture.tsx",
  allowedLines = null,
) {
  const source = ts.createSourceFile(
    absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX,
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

  // A local, reasoned exemption for ambiguous user-authored labels:
  // { /* i18n-user-content: operator-entered batch label */ child.label }
  // Only dynamic references are exempt. English fallback literals still fail.
  const userContent = (node) =>
    Boolean(
      sourceText
        .slice(node.pos, node.getStart(source))
        .match(/\/\*\s*i18n-user-content:([\s\S]*?)\*\//)?.[1]
        .trim(),
    );

  const inspectExpression = (expression, kind, exempt = false) => {
    if (!expression) return;
    exempt ||= userContent(expression);
    const node = unwrap(expression);
    if (ts.isStringLiteralLike(node)) {
      if (hasReadableWords(node.text)) report(node, kind, node.text);
    } else if (ts.isTemplateExpression(node)) {
      if (
        [node.head, ...node.templateSpans.map((span) => span.literal)].some(
          (part) => hasReadableWords(part.text),
        )
      )
        report(node, kind, node.getText(source));
      for (const span of node.templateSpans)
        inspectExpression(span.expression, kind, exempt);
    } else if (ts.isConditionalExpression(node)) {
      const condition = unwrap(node.condition);
      // ReactNode props may translate their string branch and render JSX in
      // the other branch. That non-string reference isn't untranslated text.
      let nonStringBranch;
      if (
        ts.isBinaryExpression(condition) &&
        ts.isTypeOfExpression(condition.left) &&
        ts.isStringLiteral(condition.right) &&
        condition.right.text === "string"
      ) {
        if (
          [
            ts.SyntaxKind.EqualsEqualsEqualsToken,
            ts.SyntaxKind.EqualsEqualsToken,
          ].includes(condition.operatorToken.kind)
        ) {
          nonStringBranch = node.whenFalse;
        } else if (
          [
            ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsToken,
          ].includes(condition.operatorToken.kind)
        ) {
          nonStringBranch = node.whenTrue;
        }
        if (
          nonStringBranch &&
          unwrap(nonStringBranch).getText(source) !==
            condition.left.expression.getText(source)
        ) {
          nonStringBranch = undefined;
        }
      }
      if (node.whenTrue !== nonStringBranch)
        inspectExpression(node.whenTrue, kind, exempt);
      if (node.whenFalse !== nonStringBranch)
        inspectExpression(node.whenFalse, kind, exempt);
    } else if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      // Conditions and comparisons decide what is shown; they are not labels.
      if (
        [
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.PlusToken,
        ].includes(operator)
      ) {
        inspectExpression(node.left, kind, exempt);
        inspectExpression(node.right, kind, exempt);
      } else if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        inspectExpression(node.right, kind, exempt);
      }
    } else if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      if (isTranslationCall(node)) return;
      // Follow transformations of displayed text, not arbitrary call arguments
      // (formatters, lookup IDs, API payloads, handlers, etc.).
      if (name === "String") {
        inspectExpression(node.arguments[0], kind, exempt);
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "map"
      ) {
        const callback = node.arguments[0];
        if (
          callback &&
          (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
        ) {
          if (ts.isBlock(callback.body)) {
            for (const statement of callback.body.statements) {
              if (ts.isReturnStatement(statement))
                inspectExpression(statement.expression, kind, exempt);
            }
          } else inspectExpression(callback.body, kind, exempt);
        }
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        [
          "replace",
          "replaceAll",
          "toLowerCase",
          "toUpperCase",
          "trim",
          "slice",
          "substring",
          "join",
        ].includes(node.expression.name.text)
      ) {
        inspectExpression(node.expression.expression, kind, exempt);
      } else if (!exempt && isDisplayReference(node.expression)) {
        report(node, kind, node.getText(source));
      }
    } else if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements)
        inspectExpression(element, kind, exempt);
    } else if (
      !exempt &&
      !isTranslatedLocal(node) &&
      (isDisplayReference(node) ||
        isMappedLabel(node) ||
        (ts.isElementAccessExpression(node) &&
          isDisplayReference(node.expression)))
    ) {
      report(node, kind, node.getText(source));
    }
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
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      !isInsideTranslation(node)
    ) {
      inspectExpression(node.expression, "raw JSX expression");
    }

    if (
      ts.isJsxAttribute(node) &&
      visibleAttributes.has(node.name.getText(source)) &&
      node.initializer
    ) {
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      inspectExpression(value, `raw ${node.name.getText(source)} attribute`);
    }

    if (ts.isCallExpression(node)) {
      const callName = node.expression.getText(source);
      if (/^(?:window\.)?(?:alert|confirm|prompt)$/.test(callName)) {
        inspectExpression(node.arguments[0], `raw ${callName} message`);
      }
      if (/^toast\.(?:error|success|warning|info|message)$/.test(callName)) {
        inspectExpression(node.arguments[0], `raw ${callName} message`);
      }

      if (callName === "toast") {
        inspectExpression(node.arguments[0], "raw toast message");
        const object = node.arguments.find(ts.isObjectLiteralExpression);
        for (const property of object?.properties ?? []) {
          if (
            !ts.isPropertyAssignment(property) &&
            !ts.isShorthandPropertyAssignment(property)
          )
            continue;
          const name = property.name.getText(source).replace(/["']/g, "");
          if (!["title", "description"].includes(name)) continue;
          inspectExpression(
            ts.isShorthandPropertyAssignment(property)
              ? property.name
              : property.initializer,
            `raw toast ${name}`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

export function selectFiles(repoRoot, args = []) {
  const fullScan = args.includes("--all") || args.includes("--workshop");
  const selectedScopes = args.includes("--workshop") ? workshopScopes : scopes;
  const baseIndex = args.indexOf("--base");
  if (
    baseIndex >= 0 &&
    (!args[baseIndex + 1] || args[baseIndex + 1].startsWith("--"))
  ) {
    throw new Error("--base requires a Git reference");
  }
  const selected = fullScan
    ? new Map(
        selectedScopes.flatMap((scope) =>
          walk(resolve(repoRoot, scope)).map((file) => [
            relative(repoRoot, file).replaceAll("\\", "/"),
            null,
          ]),
        ),
      )
    : changedFiles(repoRoot, baseIndex >= 0 ? args[baseIndex + 1] : null);
  return new Map(
    [...selected].filter(
      ([file]) =>
        isScannableFile(file) &&
        selectedScopes.some(
          (scope) => file === scope || file.startsWith(`${scope}/`),
        ) &&
        existsSync(resolve(repoRoot, file)),
    ),
  );
}

function main() {
  const args = process.argv.slice(2);
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const selected = selectFiles(repoRoot, args);
  const findings = [];
  for (const [file, lines] of selected) {
    const absolutePath = resolve(repoRoot, file);
    for (const violation of scanSource(
      readFileSync(absolutePath, "utf8"),
      absolutePath,
      lines,
    )) {
      findings.push({ file, ...violation });
    }
  }

  const label = args.includes("--workshop")
    ? "Workshop/Supply Chain"
    : "Seller dashboard";
  const mode =
    args.includes("--all") || args.includes("--workshop")
      ? "full audit"
      : "added lines";
  if (findings.length > 0) {
    for (const finding of findings) {
      process.stderr.write(
        `${finding.file}:${finding.line}:${finding.column} ${finding.kind}: ${finding.value}\n`,
      );
    }
    process.stderr.write(
      `\nFound ${findings.length} ${label} string(s) outside <T> or t() (${mode}; ${selected.size} file(s) scanned).\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `${label} i18n check passed (${mode}; ${selected.size} file(s) scanned).\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
