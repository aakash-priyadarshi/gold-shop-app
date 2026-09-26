import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { karigarApi } from "@/lib/api";
import { workshopApi } from "@/lib/workshop-api";
import { FactoryManagerControls } from "../FactoryManagerControls";
import { WorkshopReportView } from "../WorkshopReportView";
import { WorkshopCreateJobDialog } from "../jobs/WorkshopCreateJobDialog";
import { WorkshopJobsModule } from "../jobs/WorkshopJobsModule";
import { WorkshopOverview } from "../overview/WorkshopOverview";
import { WorkshopProductionFloor } from "../production/WorkshopProductionFloor";
import { WorkshopQcModule } from "../qc/WorkshopQcModule";
import { WorkshopRecoveryModule } from "../recovery/WorkshopRecoveryModule";
import { WorkshopReportsModule } from "../reports/WorkshopReportsModule";
import { WorkshopSettingsModule } from "../settings/WorkshopSettingsModule";
import { WorkshopTransfersModule } from "../transfers/WorkshopTransfersModule";
import { ExceptionBanner } from "../shared/ExceptionBanner";
import { ReconciliationSummary } from "../shared/ReconciliationSummary";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";
import { TransactionCorrectionDialog } from "../shared/TransactionCorrectionDialog";
import { WORKSHOP_GLOSSARY, WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";

// Use the real T component with a non-English provider, so bypasses and double
// translation are visible, and a locale switch exercises render-time translation.
const translation = vi.hoisted(() => ({ locale: "ne", t: vi.fn(), register: vi.fn() }));
vi.mock("@/providers/translation-provider", () => ({
  useT: () => translation.t,
  useTranslation: () => translation,
}));
vi.mock("@/lib/api", () => ({ karigarApi: { getSnapshot: vi.fn(), createJob: vi.fn() } }));
vi.mock("@/lib/workshop-api", () => ({ workshopApi: {
  jobs: vi.fn(), accounts: vi.fn(), catalog: vi.fn(), reports: vi.fn(), staff: vi.fn(),
  cutoverStatus: vi.fn(), transfers: vi.fn(), recoveryBags: vi.fn(), recoveryEvent: vi.fn(),
  batchReport: vi.fn(), runReport: vi.fn(), startRun: vi.fn(), inspectQc: vi.fn(),
  correctJournal: vi.fn(), createMaterial: vi.fn(), createBatchChild: vi.fn(),
  changeRouteStep: vi.fn(), manualMovement: vi.fn(), configureTolerance: vi.fn(),
  prepareTransfer: vi.fn(), inviteStaff: vi.fn(),
} }));
vi.mock("@/lib/workshop-hardware", () => ({
  listWorkshopSerialPorts: vi.fn().mockResolvedValue([]), readPhysicalWorkshopScale: vi.fn(),
}));

const ne = (text: string) => `नेपाली:${text}`;
const job = {
  id: "job-123456", product: "Custom Lotus Ring", artisan: "Ramesh Soni", qty: 2,
  status: "In Progress", currentStage: "QC", metalKey: "goldGrains995",
  trees: [{ id: "tree-123", label: "Tree Alpha", lines: [] }],
  workshopProcessRuns: [{ id: "run-1", definitionId: "process-1", status: "OPEN", department: "Casting Room" }],
  workshopRouteSteps: [{ id: "step-1", definitionId: "process-1", status: "STARTED" }],
  workshopBatchChildren: [{ id: "child-1", kind: "DESIGN_GROUP", label: "Lotus Group", quantity: 2 }],
};
const transfer = {
  id: "transfer-123", treeId: "tree-123", status: "EXCEPTION", materialKey: "goldGrains995",
  fromDepartment: "Casting Room", toDepartment: "Finishing Room", differenceGrams: "0.250",
};
const bag = {
  id: "bag-1", code: "BAG-ALPHA", materialKey: "goldGrains995", status: "OPEN",
  expectedBalanceGrams: "1.500", openedAt: new Date().toISOString(),
  events: [{ id: "event-1", status: "SENT" }],
};
const catalog = {
  devices: [{ id: "scale-1", name: "My Balance", purpose: "GOLD", adapterKind: "SERIAL", isActive: true }],
  materials: [{ id: "material-1", key: "goldGrains995", name: "My Gold", kind: "GOLD", scalePurpose: "GOLD", isActive: true }],
  processes: [{ id: "process-1", name: "Custom Casting", department: "Casting Room", isActive: true }],
  recipes: [], routes: [], workstations: [],
  tolerances: [{ id: "rule-1", movementKind: "TRANSFER_RECEIPT", scalePurpose: "GOLD", maxDifferenceGrams: "0.01", policy: "REQUIRE_CLASSIFICATION" }],
};
const journal = {
  id: "journal-123", entryNumber: 42, status: "POSTED", referenceType: "TRANSFER_DISPATCH",
  referenceId: "transfer-123", idempotencyKey: "key-123", description: "Owner note: retain original",
  weightGrams: "10.000", materialKey: "goldGrains995", postedAt: "2026-09-26T00:00:00Z", lines: [],
};
const reports = {
  materialStock: [{ materialKey: "goldGrains995", bucket: "VAULT", balanceGrams: "10.000", scopeId: "" }],
  process: [{ id: "run-1", definition: { name: "Custom Casting" }, unclassified: [{ balanceGrams: "0.125" }] }],
  processVariance: [], transferVariance: [transfer], recovery: [bag], correctionHistory: [journal],
  scaleAudit: [{ id: "reading-1", deviceName: "My Balance", adapterKind: "SERIAL", stable: true, weightGrams: "10.000", rawFrame: "ST 10.000 g", capturedAt: "2026-09-26T00:00:00Z" }],
  finishedGoods: [{ id: "item-1", nameEn: "Custom Lotus Ring", sku: "SKU-ALPHA", totalWeightGrams: 10, visibility: "PUBLIC" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  translation.locale = "ne";
  translation.t.mockImplementation((text: string) => translation.locale === "en" ? text : ne(text));
  vi.mocked(workshopApi.jobs).mockResolvedValue({ data: [job] } as any);
  vi.mocked(workshopApi.catalog).mockResolvedValue({ data: catalog } as any);
  vi.mocked(workshopApi.reports).mockResolvedValue({ data: reports } as any);
  vi.mocked(workshopApi.transfers).mockResolvedValue({ data: [transfer] } as any);
  vi.mocked(workshopApi.recoveryBags).mockResolvedValue({ data: [bag] } as any);
  vi.mocked(workshopApi.accounts).mockResolvedValue({ data: [] } as any);
  vi.mocked(workshopApi.staff).mockResolvedValue({ data: [] } as any);
  vi.mocked(workshopApi.cutoverStatus).mockResolvedValue({ data: null } as any);
  vi.mocked(workshopApi.batchReport).mockResolvedValue({ data: null } as any);
  vi.mocked(workshopApi.runReport).mockResolvedValue({ data: null } as any);
  vi.mocked(karigarApi.getSnapshot).mockResolvedValue({ data: { workshops: [{ id: "workshop-1", name: "Family Workshop", artisan: "Ramesh Soni" }] } } as any);
});

function expectUntranslated(...values: string[]) {
  const submittedText = translation.t.mock.calls.map(([text]) => String(text));
  for (const value of values) {
    expect(submittedText.some((text) => text.includes(value)), `Translation must not receive ${value}`).toBe(false);
  }
}

describe("Workshop translation boundaries", () => {
  it("translates exception strings, and keeps overview names, keys, codes and weights out of translations", async () => {
    const banner = render(<ExceptionBanner exceptions={[{
      id: "custom", title: "Scale unavailable", description: "Reconnect the scale", severity: "WARNING", category: "SCALE",
      actionHref: "/dashboard/shop/supply-chain?view=settings", actionLabel: "Inspect scale",
    }]} />);
    expect(await screen.findByText(ne("Scale unavailable"))).toBeVisible();
    expect(screen.getByText(ne("Reconnect the scale"))).toBeVisible();
    expect(screen.getByRole("link", { name: ne("Inspect scale") })).toHaveAttribute("href", "/dashboard/shop/supply-chain?view=settings");
    banner.unmount();

    render(<WorkshopOverview />);
    expect(await screen.findByText(ne("Transfer Variance Above Tolerance"))).toBeVisible();
    expect(screen.getByText(/Casting Room → Finishing Room/)).toHaveTextContent(`${ne("Difference of")} 0.250g ${ne("exceeds rule limit")}`);
    expect(screen.getByText(/Custom Lotus Ring \(Ramesh Soni\)/)).toHaveTextContent(ne("Ready for authoritative gross jewellery weigh-in and catalog stock creation"));
    expect(screen.getByText(/BAG-ALPHA/)).toHaveTextContent(ne("Material sent to refinery; record assay and classify recovered metal"));
    expectUntranslated("Custom Lotus Ring", "Ramesh Soni", "Casting Room", "Finishing Room", "BAG-ALPHA", "goldGrains995", "0.250");
  });

  it("translates job and detail statuses while retaining product names and child labels", async () => {
    render(<WorkshopJobsModule />);
    expect(await screen.findByText(ne("In Progress"))).toBeVisible();
    expect(screen.getByPlaceholderText(ne("Search by product, artisan, or job ID…"))).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ne("View Details") }));
    expect(await screen.findByText(ne("PENDING"))).toBeVisible();
    expect(screen.getByText(ne("STARTED"))).toBeVisible();
    expect(screen.getByText(ne("DESIGN_GROUP"))).toBeVisible();
    expect(screen.getByText("Lotus Group")).toBeVisible();
    expectUntranslated("Custom Lotus Ring", "Ramesh Soni", "Lotus Group", "goldGrains995");
  });

  it("preserves job creation values and translates server errors when the locale changes", async () => {
    vi.mocked(karigarApi.createJob).mockRejectedValue({ response: { data: { message: "Workshop is unavailable" } } });
    const dialog = <WorkshopCreateJobDialog open onOpenChange={vi.fn()} />;
    const { rerender } = render(dialog);
    await screen.findByRole("option", { name: "Ramesh Soni (Family Workshop)" });
    fireEvent.change(screen.getByLabelText(/नेपाली:Product \/ Design Name/), { target: { value: "Custom Lotus Ring" } });
    fireEvent.change(screen.getByLabelText(ne("Priority")), { target: { value: "URGENT" } });
    fireEvent.click(screen.getByRole("button", { name: ne("Create Work Order") }));
    expect(await screen.findByText(ne("Workshop is unavailable"))).toBeVisible();
    expect(karigarApi.createJob).toHaveBeenCalledWith(expect.objectContaining({
      product: "Custom Lotus Ring", artisan: "Ramesh Soni", workshopId: "workshop-1", priority: "URGENT", metalKey: "goldGrains995",
    }));
    translation.locale = "en";
    rerender(<WorkshopCreateJobDialog open onOpenChange={vi.fn()} />);
    expect(await screen.findByText("Workshop is unavailable")).toBeVisible();
    expectUntranslated("Custom Lotus Ring", "Ramesh Soni", "Family Workshop", "goldGrains995");
  });

  it("translates native manager options without changing their submitted enum values", async () => {
    vi.mocked(workshopApi.createMaterial).mockResolvedValue({ data: {} } as any);
    vi.mocked(workshopApi.changeRouteStep).mockResolvedValue({ data: {} } as any);
    render(<FactoryManagerControls materials={[]} routes={[]} accounts={[]} jobId="job-123456" treeId="tree-123" runId="run-1"
      definitions={[{ id: "process-1", name: "Custom Casting" }]} steps={[{ id: "step-1", definitionId: "process-1", position: 0, status: "STARTED" }]}
      onRefresh={async () => {}} />);
    for (const value of ["SOLDER", "REWORK", "DESIGN_GROUP", "REUSABLE"]) {
      expect(screen.getByRole("option", { name: ne(value), exact: true })).toHaveValue(value);
    }
    fireEvent.change(screen.getByLabelText(ne("Material key")), { target: { value: "customSolder" } });
    fireEvent.change(screen.getByLabelText(ne("Material name")), { target: { value: "Family Solder" } });
    fireEvent.click(screen.getByRole("button", { name: ne("Add physical material") }));
    await screen.findByText(ne("Material created"));
    expect(workshopApi.createMaterial).toHaveBeenCalledWith({ key: "customSolder", name: "Family Solder", kind: "SOLDER", scalePurpose: "GOLD" });
    fireEvent.change(screen.getByLabelText(ne("Job route step")), { target: { value: "step-1" } });
    fireEvent.change(screen.getByLabelText(ne("Change")), { target: { value: "REWORK" } });
    const action = screen.getByRole("button", { name: ne("Apply route change") });
    fireEvent.change(within(action.parentElement!).getByLabelText(ne("Reason")), { target: { value: "Retain my reason" } });
    fireEvent.click(action);
    await waitFor(() => expect(workshopApi.changeRouteStep).toHaveBeenCalledWith("job-123456", "step-1", { action: "REWORK", reason: "Retain my reason" }));
    expectUntranslated("Custom Casting", "customSolder", "Family Solder", "Retain my reason");
  });

  it("translates correction context and failures while preserving the journal and correction payload", async () => {
    vi.mocked(workshopApi.correctJournal).mockRejectedValue({ response: { data: { message: "Downstream movement blocks correction" } } });
    render(<TransactionCorrectionDialog journal={journal} isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(await screen.findByText(ne("Transfer Dispatch Correction"))).toBeVisible();
    expect(screen.getByRole("button", { name: ne("Close"), exact: true })).toBeVisible();
    expect(screen.getByText(/^नेपाली:Reversing this dispatch/)).toBeVisible();
    expect(screen.getByText("Owner note: retain original")).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(ne("e.g. Scale reading recalibration, misclassified stone tare, wrong drawer selected")), { target: { value: "My correction reason" } });
    fireEvent.change(screen.getByPlaceholderText("0.000"), { target: { value: "9.850" } });
    fireEvent.click(screen.getByRole("button", { name: ne("Post Corrected Replacement") }));
    expect(await screen.findByText(ne("Downstream movement blocks correction"))).toBeVisible();
    expect(workshopApi.correctJournal).toHaveBeenCalledWith("journal-123", expect.objectContaining({ replacementWeightGrams: "9.850", reason: "My correction reason" }));
    expectUntranslated("Owner note: retain original", "My correction reason", "goldGrains995", "journal-123");
  });

  it("translates production states and alert messages without translating configured process names", async () => {
    vi.mocked(workshopApi.startRun).mockRejectedValue({ response: { data: { message: "Process cannot start" } } });
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<WorkshopProductionFloor />);
    expect(await screen.findByText(ne("OPEN"))).toBeVisible();
    expect(screen.getByText(ne("In Progress"))).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Custom Casting" }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(ne("Process cannot start")));
    expect(workshopApi.startRun).toHaveBeenCalledWith({ treeId: "tree-123", definitionId: "process-1" });
    expectUntranslated("Custom Casting", "Casting Room", "Custom Lotus Ring");
    alert.mockRestore();
  });

  it("translates QC blockers and sends the raw rework decision and user reason", async () => {
    vi.mocked(workshopApi.inspectQc).mockRejectedValue({ response: { data: { message: "Inspection unavailable" } } });
    render(<WorkshopQcModule />);
    expect(await screen.findByText(`1 ${ne("open/unreconciled process run(s)")}`)).toBeVisible();
    expect(screen.getByText(`1 ${ne("unresolved route step(s) pending")}`)).toBeVisible();
    expect(screen.getByText(`1 ${ne("inter-department transfer(s) awaiting receipt")}`)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ne("Inspect & Decide") }));
    fireEvent.click(screen.getByRole("button", { name: ne("Rework") }));
    fireEvent.change(screen.getByPlaceholderText(ne("e.g. Porosity on shank, defective stone setting prongs")), { target: { value: "My repair note" } });
    fireEvent.click(screen.getByRole("button", { name: ne("Submit Decision") }));
    expect(await screen.findByText(ne("Inspection unavailable"))).toBeVisible();
    expect(workshopApi.inspectQc).toHaveBeenCalledWith("job-123456", { decision: "REWORK", reason: "My repair note" });
  });

  it("translates transfer and recovery states while preserving departments and bag codes", async () => {
    const transfers = render(<WorkshopTransfersModule />);
    expect(await screen.findByText(ne("EXCEPTION"))).toBeVisible();
    expect(screen.getByText("Casting Room")).toBeVisible();
    transfers.unmount();
    render(<WorkshopRecoveryModule />);
    expect(await screen.findByText(ne("OPEN"))).toBeVisible();
    expect(screen.getByText(ne("Opened today"))).toBeVisible();
    expect(screen.getByText("BAG-ALPHA")).toBeVisible();
    expectUntranslated("Casting Room", "Finishing Room", "BAG-ALPHA", "goldGrains995");
  });

  it("translates report states and fallback labels while preserving inventory names, SKU and raw scale frames", async () => {
    render(<WorkshopReportsModule />);
    expect(await screen.findByText(ne("VAULT"))).toBeVisible();
    expect(screen.getByText(ne("Shop / Global"))).toBeVisible();
    for (const [tab, status] of [["Transfer Variance", "EXCEPTION"], ["Recovery", "OPEN"], ["Scale Audit", "STABLE"], ["Corrections", "TRANSFER_DISPATCH"], ["Finished Goods", "PUBLIC"]]) {
      fireEvent.click(screen.getByRole("button", { name: ne(tab) }));
      expect(await screen.findByText(ne(status))).toBeVisible();
    }
    expect(screen.getByText("Custom Lotus Ring")).toBeVisible();
    expect(screen.getByText("SKU-ALPHA")).toBeVisible();
    expectUntranslated("Custom Lotus Ring", "SKU-ALPHA", "BAG-ALPHA", "ST 10.000 g", "My Balance");
  });

  it("translates legacy report cells and reconciliation tolerance labels selectively", () => {
    const view = render(<WorkshopReportView report={reports} />);
    expect(screen.getByText(ne("OPEN"))).toBeVisible();
    expect(screen.getByText(/नेपाली:EXCEPTION/)).toBeVisible();
    expect(screen.getByText(ne("VAULT"))).toBeVisible();
    expectUntranslated("BAG-ALPHA", "Casting Room", "Finishing Room", "My Balance", "goldGrains995");
    view.unmount();
    render(<ReconciliationSummary totalInputGrams="1" unclassifiedGrams="0" reconciliationState="RECONCILED"
      materialsBreakdown={[{ materialKey: "customMetal", inputGrams: "1", outputGrams: "1", unclassifiedGrams: "0", tolerance: { maxDifferenceGrams: "0.01", policy: "ACCEPT_WITHIN_TOLERANCE", isWithinTolerance: true } }]} />);
    expect(screen.getByText(/नेपाली:Within/)).toBeVisible();
    expectUntranslated("customMetal");
  });

  it("translates settings enums and success notices without changing tolerance payloads", async () => {
    vi.mocked(workshopApi.configureTolerance).mockResolvedValue({ data: {} } as any);
    vi.mocked(workshopApi.inviteStaff).mockResolvedValue({ data: {} } as any);
    render(<WorkshopSettingsModule />);
    expect(await screen.findByText(`${ne("GOLD")} (0.01g)`)).toBeVisible();
    expect(screen.getByText("My Balance")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ne("Tolerances") }));
    expect(screen.getByRole("option", { name: ne("TRANSFER_RECEIPT") })).toHaveValue("TRANSFER_RECEIPT");
    expect(screen.getByText(/नेपाली:REQUIRE_CLASSIFICATION/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ne("Save tolerance") }));
    await waitFor(() => expect(workshopApi.configureTolerance).toHaveBeenCalledWith(expect.objectContaining({ movementKind: "TRANSFER_RECEIPT", scalePurpose: "GOLD", policy: "REQUIRE_CLASSIFICATION", maxDifferenceGrams: "0.01" })));
    await screen.findByRole("button", { name: ne("Staff & Operators") });
    fireEvent.click(screen.getByRole("button", { name: ne("Staff & Operators") }));
    fireEvent.change(screen.getByPlaceholderText("operator@workshop.com"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: ne("Send Staff Invitation") }));
    expect(await screen.findByText(ne("Staff invitation sent successfully"))).toBeVisible();
    expectUntranslated("My Balance", "person@example.com", "operator@workshop.com");
  });

  it("translates scale states and errors and keeps the existing tooltip accessible", async () => {
    vi.mocked(workshopApi.catalog).mockResolvedValue({ data: { ...catalog, devices: [] } } as any);
    render(<><ScaleCapturePanel materialKey="goldGrains995" movementKind="MATERIAL_ISSUE" /><WorkshopDomainTooltip term="capture" /></>);
    expect(await screen.findByText(ne("disconnected"))).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ne("Read") }));
    expect(await screen.findByText(ne("No active scale device selected. Register or select a scale."))).toBeVisible();
    fireEvent.focus(screen.getByRole("button", { name: ne("Help info") }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(ne(WORKSHOP_GLOSSARY.capture));
    expectUntranslated("goldGrains995");
  });
});
