"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import { KARIGAR_STAGE_LABELS, type KarigarStageCode } from "@gold-shop/shared";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock,
  Coins,
  Factory,
  Scale,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SlimJob = {
  id: string;
  product: string;
  artisan: string;
  status: string;
  dueAt: string | null;
  currentStage: KarigarStageCode | null;
};

type Tower = {
  overdue: SlimJob[];
  waitingOnNext: SlimJob[];
  lossLimit: SlimJob[];
  unreceivedFg: SlimJob[];
  qcPending: SlimJob[];
  dueThisWeek: SlimJob[];
  unreceivedMetal: Array<{
    id: string;
    name: string;
    artisan: string;
    outstandingBalance: number;
  }>;
  wagesDue: Array<{
    id: string;
    name: string;
    artisan: string;
    wageDue: number;
  }>;
  lowVault: boolean;
  vaultGoldGrams: number;
  deptLoad: Array<{ stage: KarigarStageCode; count: number }>;
  reworkRate: number;
  onTimePercent: number | null;
};

function JobList({ jobs }: { jobs: SlimJob[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        <T>None</T>
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link
            href={supplyChainHref("job", { id: job.id })}
            className="text-sm hover:underline"
          >
            <span dir="auto">{job.product}</span>{" "}
            <span className="text-xs text-muted-foreground">
              <span dir="auto">{job.artisan}</span>
              {job.currentStage && (
                <>
                  {" "}
                  · <T>{KARIGAR_STAGE_LABELS[job.currentStage]}</T>
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkshopTowerPage() {
  const t = useT();
  const [tower, setTower] = useState<Tower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    karigarApi
      .workshopTower()
      .then((res) => setTower((res.data ?? res) as Tower))
      .catch((err) =>
        setError(
          err?.response?.data?.message || "Could not load workshop tower",
        ),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-rose-600">{t(error)}</p>;
  }
  if (!tower) {
    return (
      <p className="text-sm text-muted-foreground">
        <T>Loading control tower…</T>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            data-tour="workshop-tower"
          >
            <Factory className="h-6 w-6 text-amber-600" />
            <T>Workshop</T>
          </h1>
          <p className="text-sm text-muted-foreground">
            <T>
              Factory exceptions first. This is not the shop karigar book —
              billing wastage on invoices stays separate.
            </T>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={supplyChainHref("jobs")}>
              <T>Jobs</T>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={supplyChainHref("floor")}>
              <T>Floor</T>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card
          data-tour="workshop-overdue"
          className={tower.overdue.length ? "border-rose-300" : ""}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <T>Overdue jobs</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.overdue.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.overdue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <T>Waiting on next department</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.waitingOnNext.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.waitingOnNext} />
          </CardContent>
        </Card>
        <Card className={tower.lossLimit.length ? "border-rose-300" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <T>Loss-limit breaches</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.lossLimit.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.lossLimit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <T>Unreceived finished goods</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.unreceivedFg.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.unreceivedFg} />
          </CardContent>
        </Card>
        <Card data-tour="workshop-qc">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <T>QC pending</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.qcPending.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.qcPending} />
          </CardContent>
        </Card>
        <Card className={tower.lowVault ? "border-amber-400" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <T>Vault gold</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.vaultGoldGrams.toFixed(1)}</bdi> <T>g</T>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tower.lowVault ? (
              <Badge variant="destructive">
                <T>Low vault</T>
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">
                <T>Above the 50g watch level</T>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <T>Unreceived metal (karigar float)</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.unreceivedMetal.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {tower.unreceivedMetal.map((w) => (
                <li key={w.id}>
                  <span dir="auto">{w.name}</span>:{" "}
                  <bdi>{w.outstandingBalance.toFixed(2)}</bdi> <T>g</T>
                </li>
              ))}
              {tower.unreceivedMetal.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  <T>None</T>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <T>Wages awaiting settlement</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.wagesDue.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {tower.wagesDue.map((w) => (
                <li key={w.id}>
                  <span dir="auto">{w.artisan}</span>:{" "}
                  <bdi>{w.wageDue.toFixed(2)}</bdi>
                </li>
              ))}
              {tower.wagesDue.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  <T>None</T>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              <T>Due this week</T>
            </CardDescription>
            <CardTitle>
              <bdi>{tower.dueThisWeek.length}</bdi>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobList jobs={tower.dueThisWeek} />
          </CardContent>
        </Card>
      </div>

      <Card data-tour="workshop-load">
        <CardHeader>
          <CardTitle>
            <T>Department load</T>
          </CardTitle>
          <CardDescription>
            <T>
              Open jobs by current stage. Departments are Floor filters, not
              extra sidebar pages.
            </T>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tower.deptLoad.map((row) => (
            <Link
              key={row.stage}
              href={supplyChainHref("floor", { dept: row.stage })}
            >
              <Badge variant={row.count > 0 ? "default" : "secondary"}>
                <T>{KARIGAR_STAGE_LABELS[row.stage]}</T>: <bdi>{row.count}</bdi>
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <T>Rework rate</T>: <bdi>{(tower.reworkRate * 100).toFixed(0)}%</bdi>
        </span>
        <span>
          <T>On-time</T>:{" "}
          <bdi>
            {tower.onTimePercent == null
              ? "—"
              : `${(tower.onTimePercent * 100).toFixed(0)}%`}
          </bdi>
        </span>
        <Link className="underline" href={supplyChainHref("karigars")}>
          <T>Karigars</T>
        </Link>
        <Link className="underline" href={supplyChainHref("procurement")}>
          <T>Procurement</T>
        </Link>
        <Link className="underline" href={supplyChainHref("reports")}>
          <T>Reports</T>
        </Link>
      </div>
    </div>
  );
}
