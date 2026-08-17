"use client";

import { GoldLossReport } from "@/components/shop/karigar/GoldLossReport";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WorkshopReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    karigarApi
      .goldLoss()
      .then((res) => setReport(res.data ?? res))
      .catch((err) =>
        setError(err?.response?.data?.message || "Could not load workshop reports"),
      );
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        <T>Workshop reports</T>
      </h1>
      <p className="text-sm text-muted-foreground">
        <T>
          Gold loss by job, tree, and karigar. Yield, wages, and ageing reports
          come later. This is workshop metal, not invoice jarti.
        </T>
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <GoldLossReport report={report} />
      <Link className="text-sm underline" href={supplyChainHref("tower")}>
        <T>Back to tower</T>
      </Link>
    </div>
  );
}
