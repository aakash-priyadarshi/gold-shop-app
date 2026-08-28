import assert from "node:assert/strict";
import { findViolations } from "./check-next-security-config.mjs";

assert.deepEqual(findViolations("const config = { experimental: { ppr: false }, cacheComponents: false };"), []);
assert.equal(findViolations("const config = { cacheComponents: true };", "fixture.js").length, 1);
assert.equal(findViolations("const config = { experimental: { ppr: true } };", "fixture.js").length, 1);
assert.equal(findViolations("NEXT_PRIVATE_MINIMAL_MODE=1", "fixture.env").length, 1);
assert.deepEqual(findViolations("// cacheComponents: true\n# NEXT_PRIVATE_MINIMAL_MODE=1"), []);

console.log("Next security configuration guard tests passed.");
