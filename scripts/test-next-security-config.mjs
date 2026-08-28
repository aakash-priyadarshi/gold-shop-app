import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectViolations, findViolations } from "./check-next-security-config.mjs";

assert.deepEqual(findViolations("const config = { experimental: { ppr: false }, cacheComponents: false };"), []);
assert.equal(findViolations("const config = { cacheComponents: true };", "fixture.js").length, 1);
assert.equal(findViolations("const config = { experimental: { ppr: true } };", "fixture.js").length, 1);
assert.equal(findViolations("NEXT_PRIVATE_MINIMAL_MODE=1", "fixture.env").length, 1);
assert.deepEqual(findViolations("// cacheComponents: true\n# NEXT_PRIVATE_MINIMAL_MODE=1"), []);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orivraa-next-security-"));
try {
  const teamWeb = path.join(fixtureRoot, "apps", "team-web");
  fs.mkdirSync(teamWeb, { recursive: true });
  fs.writeFileSync(
    path.join(teamWeb, "next.config.js"),
    "module.exports = { cacheComponents: true };\n",
  );
  assert.ok(
    collectViolations(fixtureRoot).some(
      (violation) =>
        violation.includes("apps") &&
        violation.includes("team-web") &&
        violation.includes("cacheComponents must remain disabled"),
    ),
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("Next security configuration guard tests passed.");
