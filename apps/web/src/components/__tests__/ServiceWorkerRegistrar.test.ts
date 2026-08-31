import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isChunkLoadError,
  recoverFromChunkLoadError,
} from "../ServiceWorkerRegistrar";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

describe("recoverFromChunkLoadError", () => {
  it("does not reload when the recovery marker cannot be read", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
    });

    await expect(recoverFromChunkLoadError()).resolves.toBe(false);
  });

  it("does not reload when the recovery marker cannot be written", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage blocked");
      },
    });

    await expect(recoverFromChunkLoadError()).resolves.toBe(false);
  });
});
