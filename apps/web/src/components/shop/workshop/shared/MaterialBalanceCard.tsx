"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import { Coins, Layers, Archive, Recycle, Flame, Truck, AlertCircle, Sparkles } from "lucide-react";

export interface MaterialBalanceCardProps {
  materialKey: string;
  bucket: string;
  balanceGrams: string;
  purity?: string | null;
  scopeId?: string;
  department?: string;
}

export function MaterialBalanceCard({
  materialKey,
  bucket,
  balanceGrams,
  purity,
  department,
}: MaterialBalanceCardProps) {
  const getBucketConfig = (b: string) => {
    switch (b) {
      case "VAULT":
        return {
          label: "Vault Reserve",
          icon: Coins,
          color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
        };
      case "WIP":
        return {
          label: "Work in Progress",
          icon: Layers,
          color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900",
        };
      case "REUSABLE":
        return {
          label: "Reusable Returns",
          icon: Recycle,
          color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900",
        };
      case "SCRAP":
        return {
          label: "Scrap Metal",
          icon: Archive,
          color: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800",
        };
      case "RECOVERY_PENDING":
        return {
          label: "Recovery Bag",
          icon: Flame,
          color: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900",
        };
      case "REFINERY":
        return {
          label: "At Refinery",
          icon: Flame,
          color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900",
        };
      case "TRANSIT":
        return {
          label: "In Transit",
          icon: Truck,
          color: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-900",
        };
      case "PROCESS_VARIANCE":
        return {
          label: "Classified Variance",
          icon: AlertCircle,
          color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900",
        };
      default:
        return {
          label: b,
          icon: Sparkles,
          color: "text-foreground bg-muted border-border",
        };
    }
  };

  const config = getBucketConfig(bucket);
  const Icon = config.icon;
  const numBalance = parseFloat(balanceGrams || "0");

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-border/80">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium border ${config.color}`}>
            <Icon className="h-3 w-3 mr-1" />
            <T>{config.label}</T>
          </Badge>
          {purity && (
            <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {purity}
            </span>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground truncate">
            {materialKey === "goldGrains995" ? (
              <T>Physical Gold 995</T>
            ) : materialKey === "masterAlloy" ? (
              <T>Master Alloy</T>
            ) : (
              materialKey
            )}
            {department && <span className="text-muted-foreground/70"> · {department}</span>}
          </div>
          <div className="font-mono text-2xl font-bold tracking-tight mt-0.5 text-foreground">
            {numBalance.toFixed(3)}{" "}
            <span className="text-xs font-normal text-muted-foreground">g</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
