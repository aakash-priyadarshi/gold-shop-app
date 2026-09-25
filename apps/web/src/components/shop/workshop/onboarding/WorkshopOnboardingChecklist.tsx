"use client";

import { CheckCircle2, Circle, ArrowRight, ShieldCheck, Scale, Cpu, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { T } from "@/components/ui/T";
import Link from "next/link";
import { supplyChainHref } from "@/lib/workshop-route";

export interface WorkshopSetupStatus {
  isTraceableLedger: boolean;
  hasOpeningBalance: boolean;
  hasGoldScale: boolean;
  hasStoneScale: boolean;
  hasMaterials: boolean;
  hasRecipes: boolean;
  hasProcesses: boolean;
  hasRoutes: boolean;
  hasWorkstations: boolean;
  hasTolerances: boolean;
  hasStaff: boolean;
}

export interface WorkshopOnboardingChecklistProps {
  status: WorkshopSetupStatus;
  onNavigateTab?: (tab: string) => void;
}

export function WorkshopOnboardingChecklist({
  status,
  onNavigateTab,
}: WorkshopOnboardingChecklistProps) {
  const steps = [
    {
      id: "ledger",
      title: "Enable Traceable Metal Ledger",
      description: "Upgrade shop to immutable double-entry gram ledger",
      done: status.isTraceableLedger,
      action: "settings",
    },
    {
      id: "opening",
      title: "Verify Physical Gold 995 Opening Stock",
      description: "Weigh and initialize vault cutover balance in grams",
      done: status.hasOpeningBalance,
      action: "metal",
    },
    {
      id: "gold-scale",
      title: "Register Gold Scale (0.01g)",
      description: "Connect physical serial or TCP high-precision scale",
      done: status.hasGoldScale,
      action: "settings",
    },
    {
      id: "stone-scale",
      title: "Register Stone Scale (0.001g)",
      description: "Connect diamond/gemstone physical carat/gram scale",
      done: status.hasStoneScale,
      action: "settings",
    },
    {
      id: "materials",
      title: "Configure Physical Materials",
      description: "Define Gold 995, Master Alloy, Solder & Recovery types",
      done: status.hasMaterials,
      action: "settings",
    },
    {
      id: "recipes",
      title: "Build Alloy Recipes",
      description: "Configure 22K/18K gold compositions with 100% component fractions",
      done: status.hasRecipes,
      action: "settings",
    },
    {
      id: "processes",
      title: "Configure Processes & Default Routes",
      description: "Define factory sequence: Casting → Cutting → Filing → Polish → QC",
      done: status.hasProcesses && status.hasRoutes,
      action: "settings",
    },
    {
      id: "workstations",
      title: "Add Factory Workstations",
      description: "Register physical casting benches, furnaces, and polishing machines",
      done: status.hasWorkstations,
      action: "settings",
    },
    {
      id: "tolerances",
      title: "Configure Process & Transfer Tolerances",
      description: "Set allowed discrepancy thresholds and auto-acceptance rules",
      done: status.hasTolerances,
      action: "settings",
    },
    {
      id: "staff",
      title: "Invite Operators & Supervisors",
      description: "Grant scale weighing and variance approval permissions",
      done: status.hasStaff,
      action: "settings",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (completedCount === steps.length) {
    return null; // All done!
  }

  return (
    <Card className="border-amber-200 dark:border-amber-950/60 bg-gradient-to-br from-amber-50/40 via-card to-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base font-bold">
                <T>Manufacturing OS Setup Checklist</T>
              </CardTitle>
              <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300 text-xs">
                {completedCount} / {steps.length} <T>Complete</T>
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              <T>Complete these verified steps to activate full traceable jewellery manufacturing</T>
            </CardDescription>
          </div>

          <div className="w-full sm:w-48 space-y-1">
            <div className="flex justify-between text-[11px] font-mono font-medium text-muted-foreground">
              <span><T>Progress</T></span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-amber-100 dark:bg-amber-950" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors ${
                step.done
                  ? "bg-muted/30 border-muted text-muted-foreground"
                  : "bg-background border-amber-200/70 dark:border-amber-900/40 shadow-xs"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-500 text-[10px] font-bold text-amber-600">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${step.done ? "line-through opacity-75" : "text-foreground"}`}>
                    <T>{step.title}</T>
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    <T>{step.description}</T>
                  </p>
                </div>
              </div>

              {!step.done && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/50 shrink-0"
                  asChild
                >
                  <Link href={supplyChainHref(step.action as any)}>
                    <T>Setup</T>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
