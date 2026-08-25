import {
  KARIGAR_STAGES,
  computeGoldLoss,
  stageGoldLoss,
  type KarigarStageCode,
} from "@gold-shop/shared";

export const LOW_VAULT_GRAMS = 50;

export function resolveDepartments(raw: unknown): KarigarStageCode[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...KARIGAR_STAGES];
  const valid = raw.filter(
    (stage): stage is KarigarStageCode =>
      typeof stage === "string" &&
      (KARIGAR_STAGES as readonly string[]).includes(stage),
  );
  return valid.length > 0 ? valid : [...KARIGAR_STAGES];
}

export function nextDepartment(
  current: KarigarStageCode | null | undefined,
  departments: KarigarStageCode[] = [...KARIGAR_STAGES],
): KarigarStageCode | null {
  if (!current) return departments[0] ?? null;
  const index = departments.indexOf(current);
  if (index < 0) return departments[0] ?? null;
  return departments[index + 1] ?? null;
}

export type TowerStageInput = {
  stage: KarigarStageCode;
  status: string;
  goldInGrams: number;
  goldOutGrams: number;
  scrapGrams: number;
  dustGrams: number;
  allowedWastagePercent: number;
  reworkCount: number;
  qcApprovedAt?: Date | null;
  completedAt?: Date | null;
};

export type TowerJobInput = {
  id: string;
  product: string;
  artisan: string;
  status: string;
  dueAt: Date | null;
  currentStage: KarigarStageCode | null;
  inventoryItemId: string | null;
  allowedWastagePercent: number;
  stages: TowerStageInput[];
  trees: Array<{
    issuedGrams: number;
    finishedGrams: number;
    sprueButtonGrams: number;
    recoverableGrams: number;
    allowedWastagePercent: number;
  }>;
};

export function finishedGramsForReceive(job: {
  trees: Array<{ finishedGrams: number }>;
  stages: Array<{ stage: string; goldOutGrams: number }>;
}): number {
  const fromTrees = job.trees.reduce((sum, tree) => sum + tree.finishedGrams, 0);
  if (fromTrees > 0) return fromTrees;
  const qc = job.stages.find((stage) => stage.stage === "QC");
  if (qc && qc.goldOutGrams > 0) return qc.goldOutGrams;
  const lastOut = [...job.stages]
    .reverse()
    .find((stage) => stage.goldOutGrams > 0);
  return lastOut?.goldOutGrams ?? 0;
}

function jobLoss(job: TowerJobInput) {
  if (job.trees.length > 0) {
    return computeGoldLoss({
      issuedGrams: job.trees.reduce((s, t) => s + t.issuedGrams, 0),
      finishedGrams: job.trees.reduce((s, t) => s + t.finishedGrams, 0),
      sprueButtonGrams: job.trees.reduce((s, t) => s + t.sprueButtonGrams, 0),
      recoverableGrams: job.trees.reduce((s, t) => s + t.recoverableGrams, 0),
      allowedPercent: job.allowedWastagePercent,
    });
  }
  return stageGoldLoss({
    goldInGrams: job.stages.reduce((s, st) => s + st.goldInGrams, 0),
    goldOutGrams: job.stages.reduce((s, st) => Math.max(s, st.goldOutGrams), 0),
    scrapGrams: job.stages.reduce((s, st) => s + st.scrapGrams, 0),
    dustGrams: job.stages.reduce((s, st) => s + st.dustGrams, 0),
    allowedPercent: job.allowedWastagePercent,
  });
}

function isOpenJob(job: TowerJobInput) {
  return job.status !== "Completed" && job.status !== "CANCELLED";
}

export function buildWorkshopTower(input: {
  jobs: TowerJobInput[];
  workshops: Array<{
    id: string;
    name: string;
    artisan: string;
    wageDue: number;
    outstandingBalance: number;
  }>;
  vaultGoldGrams: number;
  departments?: KarigarStageCode[];
  now?: Date;
}) {
  const departments = input.departments ?? [...KARIGAR_STAGES];
  const now = input.now ?? new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const open = input.jobs.filter(isOpenJob);

  const overdue = open.filter(
    (job) => job.dueAt != null && job.dueAt.getTime() < now.getTime(),
  );
  const dueThisWeek = open.filter(
    (job) =>
      job.dueAt != null &&
      job.dueAt.getTime() >= now.getTime() &&
      job.dueAt.getTime() <= weekEnd.getTime(),
  );
  const waitingOnNext = open.filter((job) => {
    const current = job.currentStage ?? departments[0] ?? "CASTING";
    const row = job.stages.find((stage) => stage.stage === current);
    if (!row || row.status !== "DONE") return false;
    const next = nextDepartment(current, departments);
    if (!next) return false;
    const nextRow = job.stages.find((stage) => stage.stage === next);
    return !nextRow || nextRow.goldInGrams <= 0;
  });
  const lossLimit = input.jobs.filter((job) => jobLoss(job).unexplained > 0);
  const unreceivedFg = input.jobs.filter(
    (job) =>
      !job.inventoryItemId &&
      job.stages.some(
        (stage) =>
          stage.stage === "QC" &&
          stage.status === "DONE" &&
          stage.qcApprovedAt != null,
      ),
  );
  const qcPending = open.filter((job) => {
    const qc = job.stages.find((stage) => stage.stage === "QC");
    return (
      job.currentStage === "QC" ||
      (qc != null && qc.status !== "DONE" && qc.goldInGrams > 0)
    );
  });
  const wagesDue = input.workshops.filter((w) => w.wageDue > 0.0005);
  const unreceivedMetal = input.workshops.filter(
    (w) => w.outstandingBalance > 0.0005,
  );
  const deptLoad = departments.map((stage) => ({
    stage,
    count: open.filter(
      (job) => (job.currentStage ?? departments[0] ?? "CASTING") === stage,
    ).length,
  }));
  const reworkJobs = input.jobs.filter((job) =>
    job.stages.some((stage) => stage.reworkCount > 0),
  );
  const completed = input.jobs.filter((job) => job.status === "Completed");
  const onTime =
    completed.length === 0
      ? null
      : completed.filter((job) => {
          if (!job.dueAt) return true;
          const qc = job.stages.find((stage) => stage.stage === "QC");
          const completedAt = qc?.completedAt ?? null;
          if (!completedAt) return true;
          return completedAt.getTime() <= job.dueAt.getTime();
        }).length / completed.length;

  return {
    overdue,
    waitingOnNext,
    lossLimit,
    unreceivedFg,
    unreceivedMetal,
    qcPending,
    lowVault: input.vaultGoldGrams < LOW_VAULT_GRAMS,
    vaultGoldGrams: input.vaultGoldGrams,
    wagesDue,
    dueThisWeek,
    deptLoad,
    reworkRate:
      input.jobs.length === 0 ? 0 : reworkJobs.length / input.jobs.length,
    onTimePercent: onTime,
  };
}
