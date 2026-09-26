"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";

export interface WorkshopPageHeaderProps {
  heading: string;
  description: string;
  badge?: string | number | null;
  icon?: React.ComponentType<{ className?: string }>;
  iconBgClass?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  dataTour?: string;
  className?: string;
  children?: React.ReactNode;
}

export function WorkshopPageHeader({
  heading,
  description,
  badge,
  icon: Icon,
  iconBgClass = "bg-amber-100 dark:bg-amber-950/50 text-amber-600",
  primaryAction,
  secondaryActions,
  dataTour,
  className = "",
  children,
}: WorkshopPageHeaderProps) {
  return (
    <div
      data-tour={dataTour}
      className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={`h-10 w-10 rounded-xl ${iconBgClass} flex items-center justify-center shrink-0`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">
                <T>{heading}</T>
              </h2>
              {badge != null && (
                <Badge variant="outline" className="text-xs font-mono">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <T>{description}</T>
            </p>
          </div>
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>

      {children && <div className="mt-4 pt-4 border-t border-border">{children}</div>}
    </div>
  );
}
