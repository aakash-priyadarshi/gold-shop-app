/** Copy for locked Fill from specs / Generate with AI on the product form. */
export function specsLockMessage(
  missingLabels: string[],
  includeAi: boolean,
): string {
  const buttons = includeAi
    ? "Fill from specs and Generate with AI need"
    : "Fill from specs needs";
  const still = missingLabels.length
    ? ` Still empty: ${missingLabels.join(", ")}.`
    : "";
  return `${buttons} Jewellery Type, Metal Type, and Total Weight.${still}`;
}
