import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "../ServiceWorkerRegistrar";

describe("isChunkLoadError", () => {
  it.each([
    new Error("Loading chunk 981 failed"),
    { name: "ChunkLoadError", message: "Loading chunk app/layout failed" },
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
  ])("recognizes stale-deployment failures", (error) => {
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("does not reload for unrelated runtime errors", () => {
    expect(
      isChunkLoadError(new Error("Cannot read properties of undefined")),
    ).toBe(false);
  });
});
