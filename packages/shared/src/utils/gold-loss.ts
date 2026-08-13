/**
 * Workshop / manufacturing gold loss (karigar ledger).
 *
 * Distinct from customer billing wastage (jarti) in wastage.ts.
 * All weights are grams. Loss is derived — never treat unexplained as vault stock.
 */

export const KARIGAR_STAGES = [
  "CASTING",
  "FILING",
  "POLISHING",
  "SETTING",
  "FINAL_POLISH",
  "QC",
] as const;

export type KarigarStageCode = (typeof KARIGAR_STAGES)[number];

export const KARIGAR_STAGE_LABELS: Record<KarigarStageCode, string> = {
  CASTING: "Casting",
  FILING: "Cutting / Filing",
  POLISHING: "Polishing",
  SETTING: "Stone Setting",
  FINAL_POLISH: "Final Polishing",
  QC: "QC",
};

export type GoldLossInput = {
  issuedGrams: number;
  finishedGrams: number;
  sprueButtonGrams?: number;
  recoverableGrams?: number;
  allowedPercent?: number;
};

export type GoldLossResult = {
  issued: number;
  finished: number;
  sprueButton: number;
  recoverable: number;
  accounted: number;
  actualLoss: number;
  allowedPercent: number;
  allowedLoss: number;
  unexplained: number;
};

export function roundGrams(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

/**
 * actualLoss = issued - finished - sprue/button - recoverable
 * allowedLoss = issued * (allowedPercent / 100)
 * unexplained = max(0, actualLoss - allowedLoss)
 */
export function computeGoldLoss(input: GoldLossInput): GoldLossResult {
  const issued = roundGrams(input.issuedGrams);
  const finished = roundGrams(input.finishedGrams);
  const sprueButton = roundGrams(input.sprueButtonGrams ?? 0);
  const recoverable = roundGrams(input.recoverableGrams ?? 0);
  const accounted = roundGrams(finished + sprueButton + recoverable);
  const actualLoss = roundGrams(issued - accounted);
  const allowedPercent = Number.isFinite(input.allowedPercent)
    ? Number(input.allowedPercent)
    : 0;
  const allowedLoss = roundGrams(issued * (allowedPercent / 100));
  const unexplained = roundGrams(Math.max(0, actualLoss - allowedLoss));
  return {
    issued,
    finished,
    sprueButton,
    recoverable,
    accounted,
    actualLoss,
    allowedPercent,
    allowedLoss,
    unexplained,
  };
}

export function stageGoldLoss(input: {
  goldInGrams: number;
  goldOutGrams: number;
  scrapGrams?: number;
  dustGrams?: number;
  allowedPercent?: number;
}): GoldLossResult {
  return computeGoldLoss({
    issuedGrams: input.goldInGrams,
    finishedGrams: input.goldOutGrams,
    sprueButtonGrams: 0,
    recoverableGrams: (input.scrapGrams ?? 0) + (input.dustGrams ?? 0),
    allowedPercent: input.allowedPercent,
  });
}
