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
          ? "Factory tabs (Overview, Jobs, Production, Metal, Transfers, Recovery, QC, Reports, Settings) are already unlocked on Supply Chain."
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
    return `Supply Chain is one page at /dashboard/shop/supply-chain. Karigar book is the normal small-artisan ledger; Workshop mode adds factory operations: Overview, Jobs, Production, Metal, Transfers, Recovery, QC, Reports, and Factory Settings. Your ${access.planName} plan currently includes workshop manufacturing, and Workshop mode is already on. ${livePlans} Gold loss is workshop metal, not invoice jarti.`;
  }
  if (access.workshopManufacturingEnabled) {
    return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your ${access.planName} plan currently includes workshop manufacturing, but Workshop mode is off. ${how} Then Overview, Jobs, Production, Metal, Transfers, Recovery, QC, Reports, and Factory Settings appear as tabs. ${livePlans}`;
  }
  return `Supply Chain is at /dashboard/shop/supply-chain. Karigar book is the artisan ledger. Your current plan (${access.planName}) does not include workshop manufacturing right now, so the Workshop mode switch in Settings → Preferences stays off. ${livePlans} Compare or change plans at /dashboard/shop/billing. Which plans include the flag comes from live admin plan JSON, not from a fixed price list.`;
}

export function isWorkshopMetalOperationQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(scrap return|return scrap|recoverable scrap|custom metal|custom material|issue metal|bullion reserve|process wastage|metal movement|return metal to vault|gold[-\s]loss|gold 995|fine gold 995|reversal.*entry|ledger.*correction)/.test(
    normalized,
  );
}

export function isWorkshopAccessQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(workshop mode|factory tab|factory view|workshop manufactur|unlock.*(overview|tower|jobs|production)|which plan.*workshop|plan.*workshop|enable workshop|turn on workshop|supply chain tab|include workshop|workshop entitlement|workshop access|difference.*karigar.*workshop|karigar.*workshop.*difference)/.test(
    normalized,
  );
}

function isRecoveryQuestion(normalized: string): boolean {
  return /(recovery.*bag|new.*recovery|settle.*recovery)/.test(normalized) ||
    (/\bassay\b/.test(normalized) && /\b(workshop|factory|recovery|refinery|refining)\b/.test(normalized));
}

function isFactoryConfigurationQuestion(normalized: string): boolean {
  return /(configure.*(route|recipe|process|scale|factory)|where.*(route|recipe|process|scale))/.test(normalized) ||
    (/\bsettings\b/.test(normalized) && /\b(workshop|factory)\b/.test(normalized));
}

function isFactoryOperationalQuestion(normalized: string): boolean {
  return isRecoveryQuestion(normalized) || isFactoryConfigurationQuestion(normalized) ||
    /(create.*(job|work order)|new.*job|how.*create.*job|where.*create.*job|start.*process|what.*(do|next).*after.*job|create.*transfer|new.*transfer|how.*transfer|capture.*vs.*confirm|confirm.*vs.*capture|recommended.*vs.*actual|actual.*vs.*recommended|what.*reconciliation|why.*can't.*close|cannot.*close.*run|receive.*(finished|workshop)|finished.*receive|can't.*receive|cannot.*receive|why.*receive)/.test(normalized);
}

export function isWorkshopOperationalQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return isFactoryOperationalQuestion(normalized) ||
    /(cancel.*job|archive.*job|delete.*job|job.*delete|wage.*(due|settle|settlement)|settle.*wage|karigar.*(account|statement|ledger|advance|settlement)|procure.*bullion|procurement.*bullion|supplier.*bullion)/.test(normalized);
}

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

  if (isFactoryOperationalQuestion(normalized) && !factoryReady) {
    if (access.workshopManufacturingEnabled === null) {
      return "I could not verify your workshopManufacturing entitlement right now. Retry or check Billing at /dashboard/shop/billing before using factory features. Karigar Book remains at /dashboard/shop/supply-chain?view=book.";
    }
    if (access.workshopManufacturingEnabled !== true) {
      return "Factory features require the workshopManufacturing entitlement on your shop's live plan. Check the current plan options in Billing at /dashboard/shop/billing or ask your administrator to enable it. Karigar Book remains at /dashboard/shop/supply-chain?view=book.";
    }
    return "Your plan includes workshopManufacturing, but Workshop Mode is off. Turn on Workshop Mode in Shop Settings → Preferences (/dashboard/shop/settings?tab=preferences) before using factory features. Traditional artisan jobs remain available in Karigar Book at /dashboard/shop/supply-chain?view=book.";
  }

  // 1. Create Job / New Work Order
  if (/(create.*(job|work order)|new.*job|how.*create.*job|where.*create.*job)/.test(normalized)) {
    return "To create a manufacturing job, open Supply Chain → Jobs (/dashboard/shop/supply-chain?view=jobs) and click the primary '+ Create Job' button. You can also use the Create Job quick action on Overview or from the Production floor when no jobs exist. Select the product, assign an artisan/workshop, set quantity, priority, and due date. Jobs require an artisan before creation.";
  }

  // 2. What to do after creating a job / Starting process
  if (/(what.*(do|next).*after.*job|start.*process)/.test(normalized)) {
    return "After creating a job, open Supply Chain → Production (/dashboard/shop/supply-chain?view=production). Select the job from the active queue, select or start its configured process, verify physical material input, read the balance via Stable NET, capture and confirm the weight, classify post-process remainder, and reconcile the stage.";
  }

  // 3. Inter-department Transfers
  if (/(create.*transfer|new.*transfer|how.*transfer)/.test(normalized)) {
    return "To transfer physical material between departments, open Supply Chain → Transfers (/dashboard/shop/supply-chain?view=transfers) and click '+ New Transfer'. The sending department performs dispatch scale weighing, and the receiving department independently verifies receipt weight. Differences are recorded as Transfer Variance.";
  }

  // 4. Recovery Bags & Assay
  if (isRecoveryQuestion(normalized)) {
    return "Recovery bags are managed in Supply Chain → Recovery (/dashboard/shop/supply-chain?view=recovery). Click '+ New Recovery Bag' to collect floor sweeps, filing dust, or polishing residue into serialized bags (held in 'Recovery Pending'). When refined bullion returns from the refinery, recording the scale-confirmed physical recovery result is mandatory before final settlement. A laboratory assay purity certificate is optional.";
  }

  // 5. Capture vs Confirm
  if (/(capture.*vs.*confirm|confirm.*vs.*capture)/.test(normalized)) {
    return "In Workshop production: 'Capture' stores the stable net weight reading from the digital scale without altering stock. 'Confirm' then posts that recorded weight to the immutable double-entry workshop ledger.";
  }

  // 6. Recommended vs Actual / Theoretical
  if (/(recommended.*vs.*actual|actual.*vs.*recommended)/.test(normalized)) {
    return "'Recommended' is a recipe-based calculation that guides the operator without moving inventory. 'Actual' is the physical weight confirmed by a hardware scale reading, which directly updates the traceable workshop stock ledger. 'Theoretical' represents the ideal CAD design target.";
  }

  // 7. Reconciliation / Cannot Close Run
  if (/(what.*reconciliation|why.*can't.*close|cannot.*close.*run)/.test(normalized)) {
    return "Stage reconciliation requires that Total Input (issued metal plus additions) equals Total Output (WIP piece, reusable sprue, scrap, recovery dust, or accounted variance within tolerance). You cannot close a process run until all output metal is classified and the physical balance reconciles.";
  }

  // 8. Configure Routes / Recipes / Scales / Factory Settings
  if (isFactoryConfigurationQuestion(normalized)) {
    if (/(route|routes)/.test(normalized)) {
      return "Factory routes are configured in Supply Chain → Factory Settings → Routes (/dashboard/shop/supply-chain?view=settings). Configure your factory in this order: 1. Scales → 2. Materials → 3. Recipes → 4. Processes → 5. Routes → 6. Workstations → 7. Tolerances → 8. Staff.";
    }
    return "Factory setup is managed in Supply Chain → Factory Settings (/dashboard/shop/supply-chain?view=settings). Configure your factory in this order: 1. Scales → 2. Materials → 3. Recipes → 4. Processes → 5. Routes → 6. Workstations → 7. Tolerances → 8. Staff.";
  }

  // 9. Finished goods receipt
  if (/(receive.*(finished|workshop)|finished.*receive|can't.*receive|cannot.*receive|why.*receive)/.test(normalized)) {
    return "Finished goods can be received only after the job is approved in Supply Chain → QC. Approve it there, then open the Jobs tab or job card and choose Receive finished goods. This adds or updates inventory; it does not create a customer invoice or sale price.";
  }

  // 10. Cancel job
  if (/(cancel.*job|archive.*job|delete.*job|job.*delete)/.test(normalized)) {
    return "Use Cancel / archive on the job instead of deleting its history. Cancellation is terminal for production: it keeps the recorded work visible but does not allow more stage work, metal issue, or finished-goods receipt. Do not use cancellation to correct metal already issued or returned; record the appropriate return or reconciliation movement instead.";
  }

  // 11. Wages & Settlements
  if (/(wage.*(due|settle|settlement)|settle.*wage|karigar.*(account|statement|ledger|advance|settlement))/.test(normalized)) {
    return "Wages due are accrued when finished metal is returned at the karigar's configured rate. That amount is separate from the physical-metal return and outstanding balance. Karigar accounts and wage settlements are managed in Supply Chain at /dashboard/shop/supply-chain?view=book. Click 'Account' on any karigar to view their unified financial statement, record settlement payments against accrued wages, log advances, perform authorized adjustments with required reason notes, and export or print physical reconciliation statements.";
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
    return "Open Supply Chain at /dashboard/shop/supply-chain. Use the Metal tab (?view=metal) for factory job issue/return, Gold 995 balances, immutable movement journals, and audit corrections (reversal and replacement). Karigar book (?view=book) handles vault bullion, artisan float, and Issue Metal to karigars. Gold loss is workshop metal, not invoice jarti.";
  }
  if (access.workshopManufacturingEnabled === true) {
    return "Open Supply Chain at /dashboard/shop/supply-chain on the Karigar book tab for vault bullion, artisan float, and job scrap. Turn Workshop mode on at Shop Settings → Preferences to unlock the Metal tab for factory Gold 995 movements and corrections.";
  }
  if (access.workshopManufacturingEnabled === false) {
    return "Open Supply Chain at /dashboard/shop/supply-chain. Karigar book covers vault bullion, artisan float, and job scrap. Factory Metal tab needs workshop manufacturing on your plan plus Workshop mode in Settings → Preferences.";
  }
  return "Open Supply Chain at /dashboard/shop/supply-chain. Karigar book handles vault bullion, artisan float, and job scrap. I could not verify your factory-tab entitlement right now — retry or check Billing before using the Metal tab.";
}
