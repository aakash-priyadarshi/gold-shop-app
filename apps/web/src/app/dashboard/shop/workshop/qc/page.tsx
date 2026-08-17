"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import { KARIGAR_STAGE_LABELS, type KarigarStageCode } from "@gold-shop/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Job = {
  id: string;
  product: string;
  artisan: string;
  currentStage?: KarigarStageCode | null;
  stages?: Array<{ stage: string; goldInGrams: number; reworkCount?: number }>;
};

export default function WorkshopQcPage() {
  const t = useT();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return karigarApi
      .workshopFloor("QC")
      .then((res) => setJobs((res.data ?? res).jobs ?? []))
      .catch((err) =>
        setError(err?.response?.data?.message || "Could not load QC queue"),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inspect = async (
    jobId: string,
    decision: "APPROVED" | "REWORK" | "REJECTED",
  ) => {
    setError(null);
    try {
      await karigarApi.inspectQc(jobId, {
        decision,
        rejectionReason: reasons[jobId] || undefined,
        reworkToStage: decision === "REWORK" ? "FILING" : undefined,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "QC action failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-tour="workshop-qc-page">
          <T>QC</T>
        </h1>
        <p className="text-sm text-muted-foreground">
          <T>
            Inspect, send back for rework, or reject. Approve does not write
            invoices.
          </T>
        </p>
      </div>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardHeader>
            <CardTitle className="text-base">
              <Link
                className="hover:underline"
                href={supplyChainHref("job", { id: job.id })}
              >
                <span dir="auto">{job.product}</span>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <span className="text-sm text-muted-foreground">
              <span dir="auto">{job.artisan}</span> ·{" "}
              <T>
                {job.currentStage
                  ? KARIGAR_STAGE_LABELS[job.currentStage]
                  : "QC"}
              </T>
            </span>
            <Input
              className="max-w-xs"
              dir="auto"
              placeholder={t("Reason")}
              value={reasons[job.id] ?? ""}
              onChange={(e) =>
                setReasons((p) => ({ ...p, [job.id]: e.target.value }))
              }
            />
            <Button size="sm" onClick={() => inspect(job.id, "APPROVED")}>
              <T>Approve</T>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => inspect(job.id, "REWORK")}
            >
              <T>Rework</T>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => inspect(job.id, "REJECTED")}
            >
              <T>Reject</T>
            </Button>
          </CardContent>
        </Card>
      ))}
      {jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          <T>No jobs waiting in QC.</T>
        </p>
      )}
    </div>
  );
}
