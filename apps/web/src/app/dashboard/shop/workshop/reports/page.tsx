"use client";

import { GoldLossReport } from "@/components/shop/karigar/GoldLossReport";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WorkshopReportsPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    karigarApi.goldLoss().then((res) => setReport(res.data ?? res));
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
      <GoldLossReport report={report} />
      <Link className="text-sm underline" href="/dashboard/shop/workshop">
        <T>Back to tower</T>
      </Link>
    </div>
  );
}
