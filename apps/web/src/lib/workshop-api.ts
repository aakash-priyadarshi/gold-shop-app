import { api } from "@/lib/api";

const root = "/karigar/workshop";
let selectedStaffShopId: string | null = null;
export function selectStaffWorkshop(shopId: string | null) {
  selectedStaffShopId = shopId;
}

api.interceptors.request.use((config) => {
  if (selectedStaffShopId && config.url?.startsWith(root)) {
    config.headers.set("x-workshop-shop-id", selectedStaffShopId);
  }
  return config;
});

// ── Types ──
export interface WorkshopMaterialComposition {
  element: string;
  percentage: number;
}

export interface WorkshopMaterial {
  id: string;
  key: string;
  name: string;
  kind: string;
  scalePurpose: "GOLD" | "STONE";
  theoreticalPurity?: string | null;
  composition?: WorkshopMaterialComposition[] | null;
  isActive: boolean;
}

export interface WorkshopRecipeComponent {
  element: string;
  percentage: number;
}

export interface WorkshopRecipe {
  id: string;
  name: string;
  version: number;
  targetFineGoldFraction: string;
  alloyFineGoldFraction: string;
  components?: WorkshopRecipeComponent[] | null;
  isActive: boolean;
}

export interface WorkshopProcessDefinition {
  id: string;
  name: string;
  department?: string | null;
  defaultScrapRate?: string | null;
  sequence?: number;
  isActive: boolean;
}

export interface WorkshopRouteStep {
  id: string;
  position: number;
  definitionId: string;
  status: string;
  reason?: string | null;
  definition?: WorkshopProcessDefinition;
}

export interface WorkshopRouteTemplate {
  id: string;
  name: string;
  isActive: boolean;
  steps: WorkshopRouteStep[];
}

export interface WorkshopWorkstation {
  id: string;
  name: string;
  department?: string | null;
  definitionId?: string | null;
  definition?: { id: string; name: string } | null;
  isActive: boolean;
}

export interface WorkshopToleranceRule {
  id: string;
  movementKind: string;
  definitionId?: string;
  materialKey: string;
  scalePurpose: "GOLD" | "STONE";
  maxDifferenceGrams: string;
  policy: "REQUIRE_CLASSIFICATION" | "ACCEPT_WITHIN_TOLERANCE";
  isActive: boolean;
}

export interface WorkshopBatchChild {
  id: string;
  treeId: string;
  kind: "DESIGN_GROUP" | "ORDER_GROUP" | "PIECE";
  label: string;
  quantity: number;
}

export interface WorkshopProcessRun {
  id: string;
  jobId: string;
  treeId: string;
  batchChildId?: string | null;
  definitionId: string;
  routeStepId?: string | null;
  status: "OPEN" | "RECONCILIATION_PENDING" | "RECONCILED" | "CANCELLED";
  department: string;
  workstationId?: string | null;
  recipeId?: string | null;
  targetWeightGrams?: string | null;
  operatorUserId: string;
  approvalUserId?: string | null;
  approvalAt?: string | null;
  approvalReason?: string | null;
  notes?: string | null;
  startedAt: string;
  endedAt?: string | null;
  definition?: WorkshopProcessDefinition;
  workstation?: WorkshopWorkstation;
  recipe?: WorkshopRecipe;
  job?: { id: string; product: string };
  batchChild?: WorkshopBatchChild;
  unclassified?: Array<{
    accountId: string;
    materialKey: string;
    balanceGrams: string;
  }>;
}

export interface WorkshopCastingTreeLine {
  id: string;
  weightGrams: number;
  sortOrder?: number;
}

export interface WorkshopCastingTree {
  id: string;
  label: string;
  metalKey: string;
  issuedGrams: number;
  lines: WorkshopCastingTreeLine[];
}

export interface WorkshopJob {
  id: string;
  product: string;
  artisan: string;
  metalKey?: string;
  status: string;
  qty: number;
  inventoryItemId?: string | null;
  trees: WorkshopCastingTree[];
  workshopProcessRuns: WorkshopProcessRun[];
  workshopRouteSteps: WorkshopRouteStep[];
  workshopBatchChildren: WorkshopBatchChild[];
}

export interface WorkshopAccount {
  id: string;
  name?: string;
  materialKey: string;
  bucket: string;
  scopeId: string;
  balanceGrams: string;
  purity?: string | null;
}

export interface WorkshopTransfer {
  id: string;
  treeId: string;
  materialKey: string;
  fromDepartment: string;
  toDepartment: string;
  status: "PREPARED" | "DISPATCHED" | "RECEIVED" | "EXCEPTION" | "RECONCILED" | "CANCELLED";
  dispatchReadingId?: string | null;
  dispatchReading?: { id: string; weightGrams: number | string; readingAt: string };
  receiveReadingId?: string | null;
  receiveReading?: { id: string; weightGrams: number | string; readingAt: string };
  differenceGrams?: string | null;
  toleranceRuleId?: string | null;
  toleranceRule?: { id: string; maxDifferenceGrams: number | string };
  exceptionReason?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface WorkshopRecoveryContainer {
  id: string;
  code: string;
  materialKey: string;
  status: "OPEN" | "CLOSED" | "PROCESSED";
  expectedBalanceGrams: string;
  openedAt: string;
  closedAt?: string | null;
  destination?: string | null;
  events: Array<{
    id: string;
    status: string;
    varianceGrams?: string | null;
    assays?: Array<{ fineGoldFraction: string }>;
  }>;
}

export interface WorkshopRecoveryEvent {
  id: string;
  containerId: string;
  status: "OPEN" | "SENT" | "RECONCILED";
  sendGrams?: string | null;
  bagUnclassifiedGrams?: string;
  refineryUnclassifiedGrams?: string;
  varianceGrams?: string | null;
  container: { id: string; code: string; materialKey: string };
  sendReading?: { id: string; weightGrams: number | string; actorUserId: string } | null;
  assays: Array<{ id: string; fineGoldFraction: string; source: string; evidence?: string | null }>;
  journals: WorkshopJournalEntry[];
}

export interface WorkshopJournalLine {
  accountId: string;
  debitGrams: string;
  creditGrams: string;
  account: { id: string; materialKey: string; bucket: string; scopeId: string };
}

export interface WorkshopJournalEntry {
  id: string;
  entryNumber: number;
  status: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  description: string;
  weightGrams: string;
  materialKey: string;
  purity?: string | null;
  jobId?: string | null;
  treeId?: string | null;
  processRunId?: string | null;
  transferId?: string | null;
  recoveryContainerId?: string | null;
  recoveryEventId?: string | null;
  scaleReadingId?: string | null;
  scaleReading?: {
    id: string;
    rawFrame: string;
    weightGrams: string;
    stable: boolean;
    sequence: number;
    capturedAt: string;
  } | null;
  actorUserId?: string | null;
  reversalOfId?: string | null;
  reversedById?: string | null;
  reversedBy?: { id: string } | null;
  replacementForId?: string | null;
  metadata?: Record<string, unknown> | null;
  postedAt: string;
  lines: WorkshopJournalLine[];
}

export interface WorkshopCutoverStatus {
  workshopMode: boolean;
  workshopLedgerVersion: "LEGACY" | "TRACEABLE";
  hasOpeningBalance: boolean;
  openingGoldGrams: string;
  openingDate: string | null;
}

export interface WorkshopCatalogResponse {
  materials: WorkshopMaterial[];
  recipes: WorkshopRecipe[];
  definitions: WorkshopProcessDefinition[];
  routes: WorkshopRouteTemplate[];
  workstations: WorkshopWorkstation[];
  devices: any[];
  tolerances: WorkshopToleranceRule[];
}

export interface WorkshopReportsResponse {
  generatedAt: string;
  materialStock: Array<{
    accountId: string;
    materialKey: string;
    bucket: string;
    scopeId: string;
    balanceGrams: string;
    purity: string | null;
  }>;
  process: WorkshopProcessRun[];
  processVariance: Array<{
    id: string;
    processRunId: string | null;
    materialKey: string;
    weightGrams: string;
    classifiedAt: string;
    approverUserId: string;
    process: any | null;
  }>;
  transferVariance: Array<{
    id: string;
    treeId: string;
    materialKey: string;
    fromDepartment: string;
    toDepartment: string;
    status: string;
    dispatchGrams: string | null;
    receiveGrams: string | null;
    differenceGrams: string | null;
    toleranceGrams: string | null;
    exceptionReason?: string | null;
    approvedByUserId?: string | null;
  }>;
  recovery: Array<{
    id: string;
    code: string;
    materialKey: string;
    status: string;
    expectedBalanceGrams: string;
    events: Array<{
      id: string;
      status: string;
      varianceGrams: string | null;
      assayedFractions: string[];
    }>;
  }>;
  scaleAudit: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    adapterKind: string;
    purpose: string;
    weightGrams: string;
    stable: boolean;
    sequence: number;
    readingAt: string;
    capturedAt: string;
    actorUserId: string;
    rawFrame: string;
    samples: any[];
    journalId: string | null;
    referenceType: string | null;
  }>;
  correctionHistory: WorkshopJournalEntry[];
  finishedGoods: Array<{
    id: string;
    nameEn: string;
    sku: string;
    totalWeightGrams: number;
    visibility: string;
    workshopReceiptJournalId: string | null;
  }>;
}

export interface RunReconciliationResponse {
  run: WorkshopProcessRun;
  materials: Array<{
    materialKey: string;
    inputGrams: string;
    outputGrams: string;
    unclassifiedGrams: string;
    tolerance?: {
      ruleId: string;
      maxDifferenceGrams: string;
      policy: "REQUIRE_CLASSIFICATION" | "ACCEPT_WITHIN_TOLERANCE";
      isWithinTolerance: boolean;
    } | null;
  }>;
  reconciliationState: "RECONCILED" | "RECONCILIATION_PENDING";
  journals: WorkshopJournalEntry[];
}

export interface BatchReconciliationResponse {
  treeId: string;
  jobId: string;
  theoreticalCadGrams: string;
  actualInputGrams: string;
  actualInputsByMaterial: Record<string, string>;
  recommendedInputsByMaterial: Record<string, string>;
  balancesByMaterial: Record<string, Record<string, string>>;
  dispositions: Record<string, string>;
  unclassifiedGrams: string;
  outstandingWipGrams: string;
  inTransitGrams: string;
  reconciliationState: "RECONCILED" | "RECONCILIATION_PENDING";
  children: WorkshopBatchChild[];
  processRuns: RunReconciliationResponse[];
  journals: WorkshopJournalEntry[];
  theoreticalIsStock: boolean;
}

export interface CreateMovementSessionDto {
  treeId: string;
  movementKind: string;
  materialKey: string;
  processRunId?: string;
  transferId?: string;
  recoveryContainerId?: string;
  recoveryEventId?: string;
  batchChildId?: string;
  deviceId?: string;
  destinationBucket?: string;
}

export interface ConfirmMovementSessionDto {
  readingId?: string;
  grossWeightGrams?: string;
  setStoneWeightGrams?: string;
  jewelleryType?: string;
  productName?: string;
  exceptionReason?: string;
  idempotencyKey?: string;
}

export interface CorrectJournalDto {
  replacementWeightGrams?: string;
  reason: string;
  idempotencyKey?: string;
}

export interface ManualMovementDto {
  materialKey: string;
  sourceBucket: string;
  destinationBucket: string;
  weightGrams: string;
  reason: string;
  idempotencyKey?: string;
  jobId?: string;
  treeId?: string;
  processRunId?: string;
  destinationScopeId?: string;
  sourceScopeId?: string;
}

// ── API Surface ──
export const workshopApi = {
  // Staff & Permissions
  myAssignments: () => api.get<any[]>(`${root}/my-assignments`),
  myInvitations: () => api.get<any[]>(`${root}/my-invitations`),
  acceptInvitation: (id: string) => api.post(`${root}/my-invitations/${id}/accept`),
  inviteStaff: (data: { email: string; canCapture: boolean; canApprove: boolean }) =>
    api.post(`${root}/staff/invite`, data),

  // Cutover & Ledger Version
  cutoverStatus: () => api.get<WorkshopCutoverStatus>(`${root}/cutover`),
  setLedgerVersion: (data: { workshopLedgerVersion: "LEGACY" | "TRACEABLE" }) =>
    api.patch<{ id: string; workshopLedgerVersion: string }>(`${root}/ledger-version`, data),
  postManualOpening: (data: { weightGrams: string; reason: string; source: string; idempotencyKey?: string }) =>
    api.post(`${root}/cutover/manual-opening`, data),

  // Catalog & Accounts
  catalog: () => api.get<WorkshopCatalogResponse>(`${root}/catalog`),
  accounts: () => api.get<WorkshopAccount[]>(`${root}/metal/accounts`),
  reports: () => api.get<WorkshopReportsResponse>(`${root}/reports`),

  // Devices & Hardware
  simulatorDevice: (purpose: "GOLD" | "STONE") =>
    api.post(`${root}/simulator/${purpose === "STONE" ? "stone-device" : "device"}`),
  registerDevice: (data: {
    name: string;
    purpose: "GOLD" | "STONE";
    adapterKind: "SERIAL" | "TCP";
    port?: string;
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    tcpHost?: string;
    tcpPort?: number;
    stableTokens?: string[];
    unstableTokens?: string[];
    isPrimary?: boolean;
  }) => api.post(`${root}/devices`, data),

  // Processes, Routes, Workstations, Tolerances
  createProcess: (data: { name: string; department?: string; defaultScrapRate?: number; sequence?: number }) =>
    api.post(`${root}/processes`, data),
  createRoute: (data: { name: string; stepDefinitionIds: string[] }) =>
    api.post(`${root}/routes`, data),
  createWorkstation: (data: { name: string; department?: string; definitionId?: string }) =>
    api.post(`${root}/workstations`, data),
  configureTolerance: (data: {
    movementKind: string;
    definitionId?: string;
    materialKey?: string;
    scalePurpose?: "GOLD" | "STONE";
    maxDifferenceGrams: string;
    policy?: "REQUIRE_CLASSIFICATION" | "ACCEPT_WITHIN_TOLERANCE";
  }) => api.post(`${root}/tolerances`, data),

  // Materials & Recipes
  createMaterial: (data: {
    key: string;
    name: string;
    kind: string;
    scalePurpose: "GOLD" | "STONE";
    theoreticalPurity?: string;
    composition?: WorkshopMaterialComposition[];
  }) => api.post(`${root}/materials`, data),
  materialOpening: (data: { materialKey: string; weightGrams: string; source: string; reason: string }) =>
    api.post(`${root}/materials/opening`, data),
  createRecipe: (data: {
    name: string;
    targetFineGoldFraction: string;
    alloyFineGoldFraction?: string;
    components?: WorkshopRecipeComponent[];
  }) => api.post(`${root}/recipes`, data),
  recommendRecipe: (id: string, targetWeightGrams: string) =>
    api.post<{
      recipeId: string;
      targetWeightGrams: string;
      recommendedGold995Grams: string;
      recommendedMasterAlloyGrams: string;
    }>(`${root}/recipes/${id}/recommend`, { targetWeightGrams }),

  // Jobs, Route Steps, Children, QC
  jobs: () => api.get<WorkshopJob[]>(`${root}/jobs`),
  assignRoute: (jobId: string, templateId: string) =>
    api.post(`${root}/jobs/${jobId}/route`, { templateId }),
  changeRouteStep: (jobId: string, stepId: string, data: { action: "ADD" | "SKIP" | "REORDER"; definitionId?: string; reason: string }) =>
    api.post(`${root}/jobs/${jobId}/route/${stepId}/change`, data),
  createBatchChild: (data: { treeId: string; treeLineId?: string; kind: "DESIGN_GROUP" | "ORDER_GROUP" | "PIECE"; label: string; quantity: number }) =>
    api.post(`${root}/batch-children`, data),
  inspectQc: (jobId: string, data: { decision: "APPROVED" | "REWORK" | "REJECTED"; reason?: string; notes?: string }) =>
    api.post(`${root}/jobs/${jobId}/qc`, data),

  // Process Runs & Reconciliation
  startRun: (data: {
    treeId: string;
    definitionId: string;
    batchChildId?: string;
    routeStepId?: string;
    workstationId?: string;
    recipeId?: string;
    targetWeightGrams?: string;
    department?: string;
    notes?: string;
  }) => api.post(`${root}/process-runs`, data),
  runReport: (id: string) =>
    api.get<RunReconciliationResponse>(`${root}/process-runs/${id}/reconciliation`),
  batchReport: (id: string) =>
    api.get<BatchReconciliationResponse>(`${root}/batches/${id}/reconciliation`),
  classifyRun: (id: string, materialKey: string, reason: string) =>
    api.post(`${root}/process-runs/${id}/classify-variance`, { materialKey, reason }),
  closeRun: (id: string, notes?: string) =>
    api.post(`${root}/process-runs/${id}/close`, { notes }),

  // Transfers
  transfers: () => api.get<WorkshopTransfer[]>(`${root}/transfers`),
  prepareTransfer: (data: { treeId: string; materialKey: string; fromDepartment: string; toDepartment: string }) =>
    api.post(`${root}/transfers`, data),
  approveTransfer: (id: string, reason: string) =>
    api.post(`${root}/transfers/${id}/approve`, { reason }),
  classifyTransfer: (id: string, classificationReason: string, sourceAccountId?: string) =>
    api.post(`${root}/transfers/${id}/classify-difference`, { classificationReason, ...(sourceAccountId ? { sourceAccountId } : {}) }),

  // Recovery & Assays
  recoveryBags: () => api.get<WorkshopRecoveryContainer[]>(`${root}/recovery/containers`),
  createRecoveryBag: (data: { code: string; materialKey: string; sourceProcessRunId?: string; workstationId?: string }) =>
    api.post(`${root}/recovery/containers`, data),
  createRecoveryEvent: (containerId: string) =>
    api.post(`${root}/recovery/events`, { containerId }),
  recoveryEvent: (id: string) =>
    api.get<WorkshopRecoveryEvent>(`${root}/recovery/events/${id}`),
  recordAssay: (data: { materialId: string; fineGoldFraction: string; source: string; recoveryEventId?: string; evidence?: string }) =>
    api.post(`${root}/recovery/assays`, data),
  classifyRecovery: (id: string, reason: string) =>
    api.post(`${root}/recovery/events/${id}/classify-and-close`, { reason }),

  // Movement & Weighing Sessions
  createSession: (data: CreateMovementSessionDto) =>
    api.post<{
      id: string;
      assignedSequence: number;
      requiredPurpose: "GOLD" | "STONE";
      materialKey: string;
      movementKind: string;
    }>(`${root}/movement-sessions`, data),
  capture: (id: string, data: { rawFrame: string; weightGrams: string; stable: boolean; sequence?: number; samples?: any[] }) =>
    api.post<{ id: string; weightGrams: string; stable: boolean }>(`${root}/weighing-sessions/${id}/capture`, data),
  confirm: (id: string, data: ConfirmMovementSessionDto) =>
    api.post<{
      journalId: string;
      inventoryItemId?: string;
      metalGrams?: string;
      grossGrams?: number;
      requiresApproval?: boolean;
      differenceGrams?: string;
      toleranceGrams?: string;
    }>(`${root}/movement-sessions/${id}/confirm`, data),

  // Control: Manual Overrides & Corrections
  manualMovement: (data: ManualMovementDto) =>
    api.post<{ id: string; status: string }>(`${root}/manual-movements`, data),
  correctJournal: (id: string, data: CorrectJournalDto) =>
    api.post<{
      id: string;
      status: string;
      voided?: boolean;
      voidedInventoryItemId?: string | null;
      reversalJournalId?: string;
      replacementJournalId?: string;
    }>(`${root}/journals/${id}/correct`, data),
};
