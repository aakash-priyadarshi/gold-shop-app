/** Pure ledger rules for the shop karigar book (Phase 1). */

export function issueRequiresWorkshop(workshopId?: string | null): boolean {
  return Boolean(workshopId && workshopId.trim());
}

export function wageForFinishedReturn(
  weightGrams: number,
  wageRatePerGram: number,
): number {
  if (!(weightGrams > 0) || !(wageRatePerGram > 0)) return 0;
  return Math.round(weightGrams * wageRatePerGram * 100) / 100;
}
