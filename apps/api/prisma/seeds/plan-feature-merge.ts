/** Merge seed feature flags onto an existing plan JSON without dropping extra keys. */
export function mergePlanFeatures(
  existing: unknown,
  seeded: Record<string, boolean>,
): Record<string, boolean> {
  const current =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const merged: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === "boolean") merged[key] = value;
  }
  return { ...merged, ...seeded };
}
