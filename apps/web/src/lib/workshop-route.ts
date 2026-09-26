export const SUPPLY_CHAIN_PATH = "/dashboard/shop/supply-chain";

export type WorkshopView =
  | "overview"
  | "jobs"
  | "job"
  | "production"
  | "metal"
  | "transfers"
  | "recovery"
  | "qc"
  | "reports"
  | "book"
  | "settings"
  // Legacy aliases
  | "tower"
  | "floor"
  | "karigars"
  | "procurement";

const WORKSHOP_VIEWS = new Set<string>([
  "overview",
  "jobs",
  "job",
  "production",
  "metal",
  "transfers",
  "recovery",
  "qc",
  "reports",
  "book",
  "settings",
  "tower",
  "floor",
  "karigars",
  "procurement",
]);

export function parseWorkshopView(value: string | null): WorkshopView {
  if (!value) return "overview";
  const normalized = value.toLowerCase().trim();
  // Map legacy aliases
  if (normalized === "tower") return "overview";
  if (normalized === "floor") return "production";
  if (normalized === "ledger") return "metal";
  if (normalized === "karigars") return "book";
  if (normalized === "procurement") return "metal";

  return WORKSHOP_VIEWS.has(normalized) ? (normalized as WorkshopView) : "overview";
}

export function resolveWorkshopView(
  value: string | null,
  workshopMode: boolean,
  workshopManufacturingEnabled: boolean,
): WorkshopView {
  return value ? parseWorkshopView(value) : workshopMode && workshopManufacturingEnabled ? "overview" : "book";
}

export function supplyChainHref(
  view?: WorkshopView,
  params: Record<string, string | null | undefined> = {},
): string {
  const query = new URLSearchParams();
  if (view) {
    // Canonicalize legacy aliases in links
    const canonical =
      view === "tower"
        ? "overview"
        : view === "floor"
        ? "production"
        : view === "karigars"
        ? "book"
        : view;
    query.set("view", canonical);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `${SUPPLY_CHAIN_PATH}?${suffix}` : SUPPLY_CHAIN_PATH;
}

export function legacyWorkshopDestination(
  pathname: string,
  currentSearch = "",
): string {
  const suffix = pathname
    .replace(/^\/dashboard\/shop\/workshop\/?/, "")
    .replace(/\/$/, "");
  const current = new URLSearchParams(currentSearch);
  if (!suffix) return supplyChainHref("overview");
  if (suffix === "jobs") return supplyChainHref("jobs");
  if (suffix.startsWith("jobs/")) {
    return supplyChainHref("job", {
      id: decodeURIComponent(suffix.slice("jobs/".length)),
    });
  }
  if (suffix === "floor") {
    return supplyChainHref("production", { dept: current.get("dept") });
  }
  if (suffix === "ledger") return supplyChainHref("metal");
  if (suffix === "qc") return supplyChainHref("qc");
  if (suffix === "reports") return supplyChainHref("reports");
  if (suffix === "settings") return supplyChainHref("settings");
  if (suffix === "transfers") return supplyChainHref("transfers");
  if (suffix === "recovery") return supplyChainHref("recovery");
  if (suffix === "karigars") return supplyChainHref("book");
  if (suffix === "procurement") return supplyChainHref("metal");
  return supplyChainHref("overview");
}
