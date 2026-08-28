import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectViolations,
  findViolations,
  stripComments,
} from "./check-next-security-config.mjs";

assert.deepEqual(findViolations("const config = { experimental: { ppr: false }, cacheComponents: false };"), []);
assert.equal(findViolations("const config = { cacheComponents: true };", "fixture.js").length, 1);
assert.equal(findViolations("const config = { experimental: { ppr: true } };", "fixture.js").length, 1);
assert.equal(findViolations("NEXT_PRIVATE_MINIMAL_MODE=1", "fixture.env").length, 1);
assert.deepEqual(findViolations("// cacheComponents: true\n# NEXT_PRIVATE_MINIMAL_MODE=1"), []);
assert.deepEqual(findViolations("/* cacheComponents: true */"), []);
assert.ok(
  stripComments(
    'const note = "text // not a comment"; // a real comment',
  ).includes('"text // not a comment"'),
);
assert.ok(
  stripComments(
    'const note = "text /* not a comment */"; /* a real comment */',
  ).includes('"text /* not a comment */"'),
);
assert.equal(
  findViolations(
    'const note = "text // not a comment"; const config = { cacheComponents: true };',
  ).length,
  1,
);
assert.equal(
  findViolations(
    'const note = "text /* not a comment */"; const config = { cacheComponents: true };',
  ).length,
  1,
);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orivraa-next-security-"));
try {
  const teamWeb = path.join(fixtureRoot, "apps", "team-web");
  fs.mkdirSync(teamWeb, { recursive: true });
  fs.writeFileSync(
    path.join(teamWeb, "next.config.ts"),
    "export default { cacheComponents: true };\n",
  );
  for (const filename of [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ]) {
    fs.writeFileSync(
      path.join(fixtureRoot, filename),
      "export default { cacheComponents: true };\n",
    );
  }

  const violations = collectViolations(fixtureRoot);
  for (const filename of [
    "apps/team-web/next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ]) {
    const relativeFilename = filename.split("/").join(path.sep);
    assert.ok(
      violations.some((violation) =>
        violation.endsWith(
          `${relativeFilename}: cacheComponents must remain disabled`,
        ),
      ),
    );
  }
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("Next security configuration guard tests passed.");
