"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { workshopApi } from "@/lib/workshop-api";
import { supplyChainHref } from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import { KARIGAR_STAGE_LABELS, type KarigarStageCode } from "@gold-shop/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Job = {
  id: string;
  product: string;
  artisan: string;
  status?: string;
  currentStage?: KarigarStageCode | null;
  stages?: Array<{ stage: string; goldInGrams: number; reworkCount?: number }>;
};

export default function WorkshopQcPage() {
  const t = useT();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [traceable, setTraceable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await karigarApi.workshopFloor("QC");
      const floor = response.data ?? response;
      const isTraceable = floor.ledgerVersion === "TRACEABLE";
      setTraceable(isTraceable);
      if (isTraceable) {
        const jobsResponse = await workshopApi.jobs();
        const active = (jobsResponse.data ?? jobsResponse) as Job[];
        setJobs(active.filter((job) => !["Completed", "CANCELLED", "REJECTED"].includes(job.status ?? "")));
      } else {
        setJobs(floor.jobs ?? []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load QC queue");
    }
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
      if (traceable) {
        await workshopApi.inspectQc(jobId, { decision, reason: reasons[jobId]?.trim() || undefined });
      } else {
        await karigarApi.inspectQc(jobId, {
          decision,
          rejectionReason: reasons[jobId] || undefined,
          reworkToStage: decision === "REWORK" ? "FILING" : undefined,
        });
      }
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
        <p className="text-sm text-muted-foreground">{traceable ? <T>Approve only after every physical process run, route step and transfer is reconciled. Final inventory still requires a Gold Scale receipt.</T> : <T>Inspect, send back for rework, or reject. Approve does not write invoices.</T>}</p>
        {traceable && <Link href={supplyChainHref("metal")} className="text-sm underline"><T>Open measured factory workstation</T></Link>}
      </div>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}
      <div className="space-y-3" data-tour="workshop-qc-queue">
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
              disabled={traceable && !reasons[job.id]?.trim()}
              onClick={() => inspect(job.id, "REWORK")}
            >
              <T>Rework</T>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={traceable && !reasons[job.id]?.trim()}
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
    </div>
  );
}
