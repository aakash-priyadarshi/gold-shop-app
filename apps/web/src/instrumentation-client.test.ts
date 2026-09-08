import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  stop: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  init: mocks.init,
  replayIntegration: mocks.replayIntegration,
  getReplay: () => ({ stop: mocks.stop }),
}));

describe("support-session replay privacy", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.init.mockReset();
    mocks.replayIntegration.mockClear();
    mocks.stop.mockReset();
    sessionStorage.clear();
  });

  it("stops replay when support access starts after page load", async () => {
    await import("./instrumentation-client");
    const { storeSupportToken } = await import("./lib/support-session");
    storeSupportToken(`osa_${"d".repeat(64)}`);
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
});
