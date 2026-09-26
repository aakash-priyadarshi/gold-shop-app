"use client";

import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import Link from "next/link";
import type { ReactNode } from "react";

export type ExceptionSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface WorkshopException {
  id: string;
  title: string;
  description: ReactNode;
  severity: ExceptionSeverity;
  category: "TRANSFER" | "PROCESS" | "RECOVERY" | "SCALE" | "QC" | "OVERRIDE" | "RECEIPT";
  actionHref?: string;
  actionLabel?: string;
}

export interface ExceptionBannerProps {
  exceptions: WorkshopException[];
}

export function ExceptionBanner({ exceptions }: ExceptionBannerProps) {
  if (!exceptions || exceptions.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              <T>Factory Operating Smoothly</T>
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              <T>No blocking exceptions, unreconciled variances, or stalled jobs detected across departments.</T>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticals = exceptions.filter((e) => e.severity === "CRITICAL");
  const warnings = exceptions.filter((e) => e.severity === "WARNING");
  const infos = exceptions.filter((e) => e.severity === "INFO");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span><T>Action Required: Factory Exceptions</T> ({exceptions.length})</span>
        </h3>
      </div>

      <div className="grid gap-2">
        {[...criticals, ...warnings, ...infos].map((exc) => {
          const isCritical = exc.severity === "CRITICAL";
          const isWarning = exc.severity === "WARNING";

          return (
            <div
              key={exc.id}
              className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isCritical
                  ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100"
                  : isWarning
                  ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100"
                  : "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-blue-950 dark:text-blue-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical
                      ? "bg-rose-200/80 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300"
                      : isWarning
                      ? "bg-amber-200/80 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                      : "bg-blue-200/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {isCritical ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold"><T>{exc.title}</T></div>
                  <div className="text-xs opacity-90 mt-0.5">{typeof exc.description === "string" ? <T>{exc.description}</T> : exc.description}</div>
                </div>
              </div>

              {exc.actionHref && (
                <Button
                  size="sm"
                  variant={isCritical ? "destructive" : "outline"}
                  className="shrink-0 text-xs h-8 self-end sm:self-center"
                  asChild
                >
                  <Link href={exc.actionHref}>
                    {exc.actionLabel ? <T>{exc.actionLabel}</T> : <T>Resolve</T>}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
