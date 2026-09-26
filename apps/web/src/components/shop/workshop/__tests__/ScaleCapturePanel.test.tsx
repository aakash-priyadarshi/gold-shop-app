import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";
import { workshopApi } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/lib/workshop-api", () => ({ workshopApi: {
  catalog: vi.fn(), createSession: vi.fn(), capture: vi.fn(), confirm: vi.fn(), manualMovement: vi.fn(),
} }));

describe("ScaleCapturePanel movement contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a registered simulator device and confirms the captured session", async () => {
    vi.mocked(workshopApi.catalog).mockResolvedValue({ data: { devices: [{ id: "device-1", name: "Demo gold", purpose: "GOLD", adapterKind: "SIMULATOR", precisionGrams: "0.01" }] } } as any);
    vi.mocked(workshopApi.createSession).mockResolvedValue({ data: { id: "session-1", assignedSequence: 4 } } as any);
    vi.mocked(workshopApi.capture).mockResolvedValue({ data: { reading: { id: "reading-1" } } } as any);
    vi.mocked(workshopApi.confirm).mockResolvedValue({ data: { journal: { id: "journal-1" } } } as any);
    const onConfirmed = vi.fn();
    render(<ScaleCapturePanel materialKey="goldGrains995" treeId="tree-1" movementKind="MATERIAL_ISSUE" canApprove onConfirmed={onConfirmed} />);
    await waitFor(() => expect(screen.getByText(/Demo gold/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Read"));
    await waitFor(() => expect(screen.getByText("Capture Scale Weight")).not.toBeDisabled());
    fireEvent.click(screen.getByText("Capture Scale Weight"));
    await waitFor(() => expect(workshopApi.capture).toHaveBeenCalledWith("session-1", expect.objectContaining({
      deviceId: "device-1",
      reading: expect.objectContaining({ unit: "g", sequence: 4, stable: true }),
    })));
    fireEvent.click(screen.getByText("Confirm movement"));
    await waitFor(() => expect(workshopApi.confirm).toHaveBeenCalledWith("session-1", { readingId: "reading-1" }));
    expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ journalId: "journal-1" }));
  });

  it("does not fabricate a simulator when no device is registered", async () => {
    vi.mocked(workshopApi.catalog).mockResolvedValue({ data: { devices: [] } } as any);
    render(<ScaleCapturePanel materialKey="goldGrains995" treeId="tree-1" movementKind="MATERIAL_ISSUE" />);
    await waitFor(() => expect(screen.getByText("No registered scale")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Read"));
    expect(screen.getByText("No active scale device selected. Register or select a scale.")).toBeInTheDocument();
    expect(workshopApi.createSession).not.toHaveBeenCalled();
  });
});
