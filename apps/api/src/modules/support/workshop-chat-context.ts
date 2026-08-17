import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";

export type LiveWorkshopPlan = {
  displayName: string;
  name?: string | null;
  country?: string | null;
  features?: unknown;
};

export function selectPlansWithFeature(
  plans: LiveWorkshopPlan[],
  featureKey: string,
): LiveWorkshopPlan[] {
  return plans.filter((plan) =>
    PlanLimitsService.isFeatureEnabledOnPlan(plan, featureKey),
  );
}

export type LiveWorkshopAccess = {
  planName: string;
  country: string;
  workshopMode: boolean;
  workshopManufacturingEnabled: boolean;
  workshopPlanNames: string[];
};

export function formatWorkshopPlanCatalog(plans: LiveWorkshopPlan[]): string {
  if (plans.length === 0) {
    return "None of the currently active subscription plans include workshopManufacturing. An administrator can enable that flag on any plan.";
  }
  const grouped = new Map<string, string[]>();
  for (const plan of plans) {
    const country = plan.country || "ALL";
    const names = grouped.get(country) ?? [];
    if (!names.includes(plan.displayName)) names.push(plan.displayName);
    grouped.set(country, names);
  }
  return [...grouped.entries()]
    .map(([country, names]) => `${country}: ${names.join(", ")}`)
    .join("; ");
}

export function formatLiveWorkshopAccess(access: LiveWorkshopAccess): string {
  const planList =
    access.workshopPlanNames.length > 0
      ? access.workshopPlanNames.join(", ")
      : "none of the currently active plans in this shop's country";
  const flag = access.workshopManufacturingEnabled
    ? "included"
    : "not included";
  const mode = access.workshopMode ? "on" : "off";
  const nextStep = access.workshopManufacturingEnabled
    ? access.workshopMode
      ? "Factory tabs are already unlocked on Supply Chain."
      : "This shop can turn Workshop mode on now in Settings → Preferences."
    : `This shop cannot turn Workshop mode on until workshopManufacturing is enabled on ${access.planName} (or they change plan at /dashboard/shop/billing). An admin can tick that flag on any plan. Karigar book still works if karigarSupplyChain is on.`;

  return [
    "LIVE WORKSHOP ACCESS (current subscription + live plan JSON — never invent Pro+/Enterprise):",
    `- Current plan: ${access.planName}`,
    `- workshopManufacturing on this plan: ${flag}`,
    `- Workshop mode toggle on this shop: ${mode}`,
    "- Turn factory tabs on: desktop Shop Settings → Preferences → Workshop mode (/dashboard/shop/settings?tab=preferences). Mobile: Store Settings → Workshop mode (/m/settings). The switch stays disabled until this shop's live plan includes workshopManufacturing.",
    `- Live plans in ${access.country} that currently include workshopManufacturing: ${planList}. An admin can tick or untick that flag on any plan at any time; always use this list, not hardcoded pricing.`,
    `- ${nextStep}`,
  ].join("\n");
}

export function formatSellerWorkshopReply(access: LiveWorkshopAccess): string {
  const livePlans =
    access.workshopPlanNames.length > 0
      ? `Live plans in ${access.country} that currently include workshop manufacturing: ${access.workshopPlanNames.join(", ")}.`
      : `No currently active plans in ${access.country} include workshop manufacturing. An admin can enable that flag on a plan.`;
  const how =
    "Turn factory tabs on at Shop Settings → Preferences → Workshop mode (desktop: /dashboard/shop/settings?tab=preferences) or Store Settings on mobile (/m/settings).";

  if (access.workshopManufacturingEnabled && access.workshopMode) {
    return `Supply Chain is one page at /dashboard/shop/supply-chain with seven tabs: Karigar book, Tower, Jobs, Floor, Metal, QC, and Reports. Your ${access.planName} plan currently includes workshop manufacturing, and Workshop mode is already on. ${livePlans} Gold loss is workshop metal, not invoice jarti.`;
  }
  if (access.workshopManufacturingEnabled) {
    return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your ${access.planName} plan currently includes workshop manufacturing, but Workshop mode is off. ${how} Then Tower, Jobs, Floor, Metal, QC, and Reports appear as tabs. ${livePlans}`;
  }
  return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your current plan (${access.planName}) does not include workshop manufacturing right now, so the Workshop mode switch in Settings → Preferences stays off. ${livePlans} Compare or change plans at /dashboard/shop/billing. Which plans include the flag comes from live admin plan JSON, not from a fixed price list.`;
}
