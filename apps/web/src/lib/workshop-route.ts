export const SUPPLY_CHAIN_PATH = "/dashboard/shop/supply-chain";

export type WorkshopView =
  | "tower"
  | "jobs"
  | "job"
  | "floor"
  | "metal"
  | "qc"
  | "reports"
  | "karigars"
  | "procurement";

const WORKSHOP_VIEWS = new Set<WorkshopView>([
  "tower",
  "jobs",
  "job",
  "floor",
  "metal",
  "qc",
  "reports",
  "karigars",
  "procurement",
]);

export function parseWorkshopView(value: string | null): WorkshopView {
  return WORKSHOP_VIEWS.has(value as WorkshopView)
    ? (value as WorkshopView)
    : "tower";
}

export function supplyChainHref(
  view?: WorkshopView,
  params: Record<string, string | null | undefined> = {},
): string {
  const query = new URLSearchParams();
  if (view) query.set("view", view);
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
  if (!suffix) return supplyChainHref("tower");
  if (suffix === "jobs") return supplyChainHref("jobs");
  if (suffix.startsWith("jobs/")) {
    return supplyChainHref("job", {
      id: decodeURIComponent(suffix.slice("jobs/".length)),
    });
  }
  if (suffix === "floor") {
    return supplyChainHref("floor", { dept: current.get("dept") });
  }
  if (suffix === "ledger") return supplyChainHref("metal");
  if (suffix === "qc") return supplyChainHref("qc");
  if (suffix === "reports") return supplyChainHref("reports");
  if (suffix === "karigars") return supplyChainHref("karigars");
  if (suffix === "procurement") return supplyChainHref("procurement");
  return supplyChainHref("tower");
}
