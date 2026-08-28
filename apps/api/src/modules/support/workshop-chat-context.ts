import { PlanLimitsService } from "../core/subscriptions/plan-limits.service";

export type LiveWorkshopPlan = {
  displayName: string;
  name?: string | null;
  country?: string | null;
  features?: unknown;
};

/** Catalog: require the flag set true in live JSON (ignore Pro+/Enterprise missing-key defaults). */
export function selectPlansWithFeature(
  plans: LiveWorkshopPlan[],
  featureKey: string,
): LiveWorkshopPlan[] {
  return plans.filter(
    (plan) =>
      PlanLimitsService.planFeatureRecord(plan.features)[featureKey] === true,
  );
}

export type WorkshopPlanCatalogInput =
  | { status: "ok"; plans: LiveWorkshopPlan[] }
  | { status: "unavailable" };

export type LiveWorkshopAccess = {
  planName: string;
  country: string;
  workshopMode: boolean;
  workshopManufacturingEnabled: boolean | null;
  workshopPlanNames: string[];
  workshopPlanCatalogUnavailable?: boolean;
};

/**
 * Format workshop plan catalog for AI context, listing plans by country or explaining unavailability.
 */
export function formatWorkshopPlanCatalog(
  catalog: WorkshopPlanCatalogInput,
): string | undefined {
  if (catalog.status === "unavailable") {
    return "Live workshop plan catalog is temporarily unavailable. Do not claim that no plans include workshopManufacturing; say the live plan list could not be loaded and suggest retrying or opening Billing.";
  }
  if (catalog.plans.length === 0) {
    return "None of the currently active subscription plans include workshopManufacturing. An administrator can enable that flag on any plan.";
  }
  const grouped = new Map<string, string[]>();
  for (const plan of catalog.plans) {
    const country = plan.country || "ALL";
    const names = grouped.get(country) ?? [];
    if (!names.includes(plan.displayName)) names.push(plan.displayName);
    grouped.set(country, names);
  }
  return [...grouped.entries()]
    .map(([country, names]) => `${country}: ${names.join(", ")}`)
    .join("; ");
}

/**
 * Format workshop access details for AI context, including plan entitlement and mode status.
 */
export function formatLiveWorkshopAccess(access: LiveWorkshopAccess): string {
  const planList = access.workshopPlanCatalogUnavailable
    ? "temporarily unavailable — do not claim no plans include it"
    : access.workshopPlanNames.length > 0
      ? access.workshopPlanNames.join(", ")
      : "none of the currently active plans in this shop's country";
  const flag =
    access.workshopManufacturingEnabled === null
      ? "temporarily unavailable — do not claim it is off or on"
      : access.workshopManufacturingEnabled
        ? "included"
        : "not included";
  const mode = access.workshopMode ? "on" : "off";
  const nextStep =
    access.workshopManufacturingEnabled === null
      ? "Could not verify this shop's workshopManufacturing entitlement right now. Do not tell them to upgrade or that the switch is off until the plan check succeeds."
      : access.workshopManufacturingEnabled
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

/**
 * Format a customer-facing reply explaining workshop access, plan requirements, and setup steps.
 */
export function formatSellerWorkshopReply(access: LiveWorkshopAccess): string {
  const livePlans = access.workshopPlanCatalogUnavailable
    ? "Live plan catalog is temporarily unavailable — do not claim which plans include workshop manufacturing until it reloads."
    : access.workshopPlanNames.length > 0
      ? `Live plans in ${access.country} that currently include workshop manufacturing: ${access.workshopPlanNames.join(", ")}.`
      : `No currently active plans in ${access.country} include workshop manufacturing. An admin can enable that flag on a plan.`;
  const how =
    "Turn factory tabs on at Shop Settings → Preferences → Workshop mode (desktop: /dashboard/shop/settings?tab=preferences) or Store Settings on mobile (/m/settings).";

  if (access.workshopManufacturingEnabled === null) {
    return `Supply Chain is at /dashboard/shop/supply-chain (Karigar book plus optional factory tabs). I could not verify your plan's workshop manufacturing entitlement right now — please retry or open Billing. ${livePlans}`;
  }
  if (access.workshopManufacturingEnabled && access.workshopMode) {
    return `Supply Chain is one page at /dashboard/shop/supply-chain. Karigar book is the normal small-artisan ledger; Workshop mode adds the factory Tower, Jobs, Floor, Metal, QC, and Reports tabs. Your ${access.planName} plan currently includes workshop manufacturing, and Workshop mode is already on. ${livePlans} Gold loss is workshop metal, not invoice jarti.`;
  }
  if (access.workshopManufacturingEnabled) {
    return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your ${access.planName} plan currently includes workshop manufacturing, but Workshop mode is off. ${how} Then Tower, Jobs, Floor, Metal, QC, and Reports appear as tabs. ${livePlans}`;
  }
  return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your current plan (${access.planName}) does not include workshop manufacturing right now, so the Workshop mode switch in Settings → Preferences stays off. ${livePlans} Compare or change plans at /dashboard/shop/billing. Which plans include the flag comes from live admin plan JSON, not from a fixed price list.`;
}

/**
 * Check if message asks about workshop metal operations like scrap, issue, or gold loss.
 */
export function isWorkshopMetalOperationQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(scrap return|return scrap|recoverable scrap|custom metal|custom material|issue metal|bullion reserve|process wastage|metal movement|return metal to vault|gold[-\s]loss)/.test(
    normalized,
  );
}

/**
 * Check if message asks about workshop access, plan entitlement, or mode setup.
 */
export function isWorkshopAccessQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(workshop mode|factory tab|factory view|workshop manufactur|unlock.*tower|which plan.*workshop|plan.*workshop|enable workshop|turn on workshop|supply chain tab|include workshop|workshop entitlement|workshop access|difference.*karigar.*workshop|karigar.*workshop.*difference)/.test(
    normalized,
  );
}

/**
 * Check if message asks about workshop operations like job receipt, cancellation, wages, or karigar accounts.
 */
export function isWorkshopOperationalQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(receive.*(finished|workshop)|finished.*receive|can't.*receive|cannot.*receive|why.*receive|cancel.*job|archive.*job|delete.*job|job.*delete|wage.*(due|settle|settlement)|settle.*wage|karigar.*(account|statement|ledger|advance|settlement)|procure.*bullion|procurement.*bullion|supplier.*bullion)/.test(
    normalized,
  );
}

/**
 * Format a customer-facing reply for workshop operational questions, considering access level.
 */
export function formatWorkshopOperationalReply(
  access: Pick<
    LiveWorkshopAccess,
    "workshopMode" | "workshopManufacturingEnabled"
  >,
  message: string,
): string {
  const normalized = message.toLowerCase();
  const factoryReady =
    access.workshopManufacturingEnabled === true && access.workshopMode;

  if (/(receive.*(finished|workshop)|finished.*receive|can't.*receive|cannot.*receive|why.*receive)/.test(normalized)) {
    if (!factoryReady) {
      return "Finished-goods receipt is part of Workshop mode. First make sure your plan includes workshopManufacturing and turn on Workshop mode in Shop Settings → Preferences. Then complete the job's QC approval in Supply Chain → QC before receiving finished goods from its job card.";
    }
    return "Finished goods can be received only after the job is approved in Supply Chain → QC. Approve it there, then open the Jobs tab or job card and choose Receive finished goods. This adds or updates inventory; it does not create a customer invoice or sale price.";
  }

  if (/(cancel.*job|archive.*job|delete.*job|job.*delete)/.test(normalized)) {
    return "Use Cancel / archive on the job instead of deleting its history. Cancellation is terminal for production: it keeps the recorded work visible but does not allow more stage work, metal issue, or finished-goods receipt. Do not use cancellation to correct metal already issued or returned; record the appropriate return or reconciliation movement instead.";
  }

  if (/(wage.*(due|settle|settlement)|settle.*wage|karigar.*(account|statement|ledger|advance|settlement))/.test(normalized)) {
    return "Wages due are accrued when finished metal is returned at the karigar's configured rate. That amount is separate from the physical-metal return and outstanding balance. Karigar accounts and wage settlements are managed in Supply Chain at /dashboard/shop/supply-chain. Click 'Account' on any karigar to view their unified financial statement, record settlement payments against accrued wages, log advances, perform authorized adjustments with required reason notes, and export or print physical reconciliation statements. Physical metal returns (finished, unused scrap, sprue, dust) update both vault reserves and the karigar's outstanding float.";
  }

  return "Procure Bullion in Supply Chain records physical metal entering the workshop vault so it can be issued to karigars or jobs. It does not create a supplier bill, supplier payment, or customer invoice; handle those in the relevant purchasing or accounting workflow.";
}

export function formatWorkshopMetalOperationReply(
  access: Pick<
    LiveWorkshopAccess,
    "workshopMode" | "workshopManufacturingEnabled"
  >,
): string {
  const factoryReady =
    access.workshopManufacturingEnabled === true && access.workshopMode;
  if (factoryReady) {
    return "Open Supply Chain at /dashboard/shop/supply-chain. Use the Metal tab (?view=metal) for factory job issue/return, scrap, and custom alloy movements. Karigar book (default tab) still handles vault bullion, artisan float, custom materials, and Issue Metal to karigars. Scrap and recoverable dust stay on the job card and in Reports — not invoice jarti.";
  }
  if (access.workshopManufacturingEnabled === true) {
    return "Open Supply Chain at /dashboard/shop/supply-chain on the Karigar book tab for vault bullion, custom materials, Issue Metal to artisans, and job scrap. Turn Workshop mode on at Shop Settings → Preferences to unlock the Metal tab for factory job movements.";
  }
  if (access.workshopManufacturingEnabled === false) {
    return "Open Supply Chain at /dashboard/shop/supply-chain. Karigar book covers vault bullion, custom materials, Issue Metal to artisans, and job scrap. Factory Metal tab needs workshop manufacturing on your plan plus Workshop mode in Settings → Preferences.";
  }
  return "Open Supply Chain at /dashboard/shop/supply-chain. Karigar book handles vault bullion, custom materials, Issue Metal, and job scrap. I could not verify your factory-tab entitlement right now — retry or check Billing before using the Metal tab.";
}
