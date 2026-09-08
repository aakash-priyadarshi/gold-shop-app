import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushOutbox } from "./sync";

const mocks = vi.hoisted(() => {
  const state: {
    supportToken: string | null;
    onStarted?: () => void;
  } = { supportToken: null };
  const outbox = {
    where: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return {
    state,
    outbox,
    request: vi.fn(),
    getDB: vi.fn(() => ({ outbox })),
  };
});

vi.mock("@/lib/api", () => ({ api: { request: mocks.request } }));
vi.mock("@/lib/support-session", () => ({
  getSupportToken: () => mocks.state.supportToken,
  onSupportSessionStarted: (listener: () => void) => {
    mocks.state.onStarted = listener;
    return () => undefined;
  },
}));
vi.mock("./db", () => ({ getDB: mocks.getDB }));

const op = {
  id: "outbox-1",
  entity: "sale",
  method: "post" as const,
  endpoint: "/invoices",
  body: { clientId: "outbox-1" },
  status: "pending" as const,
  attempts: 0,
  createdAt: 1,
  updatedAt: 1,
};

describe("offline outbox support isolation", () => {
  beforeEach(() => {
    mocks.state.supportToken = null;
    mocks.request.mockReset();
    mocks.outbox.update.mockReset();
    mocks.outbox.delete.mockReset();
    mocks.outbox.where.mockReturnValue({
      anyOf: () => ({ sortBy: async () => [op] }),
    });
  });

  it("replays normally while support access is inactive", async () => {
    mocks.request.mockResolvedValue({ data: {} });
    await flushOutbox();
    expect(mocks.outbox.delete).toHaveBeenCalledWith(op.id);
  });

  it("aborts an in-flight replay when support access starts", async () => {
    let started!: (signal: AbortSignal) => void;
    const requestStarted = new Promise<AbortSignal>((resolve) => {
      started = resolve;
    });
    mocks.request.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          started(signal);
          signal.addEventListener("abort", () => reject(new Error("canceled")));
        }),
    );

    const flush = flushOutbox();
    const signal = await requestStarted;
    mocks.state.supportToken = `osa_${"b".repeat(64)}`;
    mocks.state.onStarted?.();
    await flush;

    expect(signal.aborted).toBe(true);
    expect(mocks.outbox.delete).not.toHaveBeenCalled();
    expect(mocks.outbox.update).toHaveBeenLastCalledWith(
      op.id,
      expect.objectContaining({ status: "pending" }),
    );
  });
});
