"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import {
  KARIGAR_STAGE_LABELS,
  KARIGAR_STAGES,
  type KarigarStageCode,
} from "@gold-shop/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type Job = {
  id: string;
  product: string;
  artisan: string;
  status: string;
  currentStage?: KarigarStageCode | null;
  dueAt?: string | null;
  stages?: Array<{
    stage: KarigarStageCode;
    goldInGrams: number;
    goldOutGrams: number;
  }>;
};

function FloorInner() {
  const t = useT();
  const search = useSearchParams();
  const dept = (search.get("dept") || "").toUpperCase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [departments, setDepartments] = useState<KarigarStageCode[]>([
    ...KARIGAR_STAGES,
  ]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return karigarApi
      .workshopFloor(dept || undefined)
      .then((res) => {
        const data = res.data ?? res;
        setJobs(data.jobs ?? []);
        if (Array.isArray(data.departments) && data.departments.length) {
          setDepartments(data.departments);
        }
      })
      .catch((err) =>
        setError(err?.response?.data?.message || "Could not load floor"),
      );
  }, [dept]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (jobId: string) => {
    setError(null);
    try {
      await karigarApi.advanceFloor(jobId, {
        goldOutGrams: Number(weights[jobId] || 0) || undefined,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not advance job");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-tour="workshop-floor">
          <T>Floor</T>
        </h1>
        <p className="text-sm text-muted-foreground">
          <T>
            Department queues. Same page, different filter — not a route per
            bench.
          </T>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={!dept ? "default" : "outline"} asChild>
          <Link href={supplyChainHref("floor")}>
            <T>All</T>
          </Link>
        </Button>
        {departments.map((stage) => (
          <Button
            key={stage}
            variant={dept === stage ? "default" : "outline"}
            asChild
          >
            <Link href={supplyChainHref("floor", { dept: stage })}>
              <T>{KARIGAR_STAGE_LABELS[stage]}</T>
            </Link>
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}
      <div className="grid gap-3">
        {jobs.map((job) => {
          const stage = job.currentStage ?? "CASTING";
          const row = job.stages?.find((s) => s.stage === stage);
          return (
            <Card key={job.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <Link
                    className="hover:underline"
                    href={supplyChainHref("job", { id: job.id })}
                  >
                    <span dir="auto">{job.product}</span>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3 text-sm">
                <span>
                  <span dir="auto">{job.artisan}</span> ·{" "}
                  <T>{KARIGAR_STAGE_LABELS[stage]}</T>
                </span>
                <span>
                  <T>In</T> <bdi>{(row?.goldInGrams ?? 0).toFixed(3)} g</bdi>
                </span>
                <Input
                  className="w-28"
                  placeholder={t("Gold out")}
                  value={weights[job.id] ?? String(row?.goldOutGrams || "")}
                  onChange={(e) =>
                    setWeights((p) => ({ ...p, [job.id]: e.target.value }))
                  }
                />
                <Button size="sm" onClick={() => advance(job.id)}>
                  <T>Advance</T>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            <T>No jobs in this queue.</T>
          </p>
        )}
      </div>
    </div>
  );
}

export default function WorkshopFloorPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">
          <T>Loading floor…</T>
        </p>
      }
    >
      <FloorInner />
    </Suspense>
  );
}
