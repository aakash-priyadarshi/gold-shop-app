import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  CaptureWeightDialog,
  confirmIssuePayload,
} from "../CaptureWeightDialog";
import { karigarApi } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  karigarApi: {
    getSnapshot: vi.fn(),
    workshopMetalAccounts: vi.fn(),
    workshopSimulatorDevice: vi.fn(),
    createWeighingSession: vi.fn(),
    captureWeighingSession: vi.fn(),
    confirmWeighingSession: vi.fn(),
  },
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (s: string) => s,
  useTranslation: () => ({
    t: (s: string) => s,
    locale: "en",
    register: () => {},
    loading: false,
    hasTranslation: () => true,
  }),
}));

describe("CaptureWeightDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(karigarApi.getSnapshot).mockResolvedValue({
      data: {
        workshopLedgerVersion: "TRACEABLE",
        jobs: [
          {
            id: "job-1",
            product: "Casting batch",
            trees: [{ id: "tree-1", label: "Tree", metalKey: "goldGrains995" }],
          },
        ],
      },
    } as never);
    vi.mocked(karigarApi.workshopMetalAccounts).mockResolvedValue({
      data: {
        simulatorAllowed: true,
        accounts: [
          { systemKey: "GOLD995_VAULT", balanceGrams: "1000.000000" },
          { systemKey: "CASTING_TREE_WIP", balanceGrams: "0.000000" },
        ],
      },
    } as never);
    vi.mocked(karigarApi.workshopSimulatorDevice).mockResolvedValue({
      data: { id: "device-1" },
    } as never);
    vi.mocked(karigarApi.createWeighingSession).mockResolvedValue({
      data: { id: "session-1" },
    } as never);
    vi.mocked(karigarApi.captureWeighingSession).mockResolvedValue({
      data: {
        reading: {
          id: "reading-1",
          weightGrams: "100.250000",
          stable: true,
          actorUserId: "operator-1",
        },
      },
    } as never);
    vi.mocked(karigarApi.confirmWeighingSession).mockResolvedValue({
      data: { journal: { id: "journal-1" } },
    } as never);
  });

  it("does not put a weight field on confirm", () => {
    expect(confirmIssuePayload("reading-1", "k1")).toEqual({
      readingId: "reading-1",
      idempotencyKey: "k1",
    });
    expect(confirmIssuePayload("reading-1", "k1")).not.toHaveProperty(
      "weightGrams",
    );
  });

  it("keeps Capture Weight disabled while the simulator is unstable", async () => {
    render(<CaptureWeightDialog />);
    await waitFor(() => screen.getByText("Gold 995 — Capture Weight"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Capture Weight" }),
    ).toBeDisabled();
  });

  it("captures a stable reading then confirms by readingId only", async () => {
    render(<CaptureWeightDialog />);
    await waitFor(() => screen.getByText("Gold 995 — Capture Weight"));
    fireEvent.click(screen.getByRole("button", { name: "Connect Gold Scale simulator" }));
    await waitFor(() =>
      expect(karigarApi.workshopSimulatorDevice).toHaveBeenCalled(),
    );
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: "Capture Weight" })).not.toBeDisabled(),
      { timeout: 4000 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Capture Weight" }));
    await waitFor(() => screen.getByTestId("scale-confirm"));
    expect(screen.getByText("100.250000", { exact: false })).toBeTruthy();
    expect(screen.getAllByText("device-1", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText("operator-1", { exact: false })).toBeTruthy();
    expect(within(screen.getByTestId("scale-confirm")).getByText("Casting batch — Tree", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Capture Weight" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(karigarApi.confirmWeighingSession).toHaveBeenCalledWith("session-1", {
        readingId: "reading-1",
        idempotencyKey: "confirm:reading-1",
      }),
    );
    expect(karigarApi.confirmWeighingSession.mock.calls[0][1]).not.toHaveProperty(
      "weightGrams",
    );
    await waitFor(() => screen.getByTestId("scale-success"));
  });

  it("discards an unposted capture so the operator can capture again", async () => {
    render(<CaptureWeightDialog />);
    await waitFor(() => screen.getByRole("button", { name: "Connect Gold Scale simulator" }));
    fireEvent.click(screen.getByRole("button", { name: "Connect Gold Scale simulator" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Capture Weight" })).not.toBeDisabled(), { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Capture Weight" }));
    await waitFor(() => screen.getByTestId("scale-confirm"));
    expect(screen.getByRole("combobox")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Discard reading" }));
    expect(screen.queryByTestId("scale-confirm")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toBeDisabled();
    expect(karigarApi.confirmWeighingSession).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Capture Weight" })).not.toBeDisabled(), { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Capture Weight" }));
    await waitFor(() => expect(karigarApi.createWeighingSession).toHaveBeenCalledTimes(2));
  });

  it("does not offer the simulator when the server has not authorized it", async () => {
    vi.mocked(karigarApi.workshopMetalAccounts).mockResolvedValue({
      data: { simulatorAllowed: false, accounts: [] },
    } as never);
    render(<CaptureWeightDialog />);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Connect Gold Scale simulator" })).not.toBeInTheDocument());
    expect(karigarApi.workshopMetalAccounts).toHaveBeenCalled();
  });
});
