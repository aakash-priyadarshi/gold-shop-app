"use client";

import {
  KarigarJobGoldCard,
  type JobGold,
} from "@/components/shop/karigar/KarigarJobGoldCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { KARIGAR_STAGE_LABELS, type KarigarStageCode } from "@gold-shop/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Job = JobGold & {
  dueAt?: string | null;
  priority?: string;
  qty?: number;
  sizeLabel?: string | null;
  purity?: string | null;
  metalColor?: string | null;
  notes?: string | null;
  currentStage?: KarigarStageCode | null;
  inventoryItemId?: string | null;
};

export default function WorkshopJobCardPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return karigarApi
      .getJob(jobId)
      .then((res) => setJob((res.data ?? res) as Job))
      .catch((err) =>
        setError(err?.response?.data?.message || "Job not found"),
      );
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const receive = async () => {
    setBusy(true);
    setError(null);
    try {
      await karigarApi.receiveFg(jobId, { sku: sku || undefined });
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Could not receive finished goods",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!job && !error) {
    return (
      <p className="text-sm text-muted-foreground">
        <T>Loading job card…</T>
      </p>
    );
  }
  if (!job) {
    return <p className="text-sm text-rose-600">{error ? t(error) : null}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" dir="auto">
            {job.product}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span dir="auto">{job.artisan}</span>
            {job.currentStage && (
              <>
                {" "}
                · <T>{KARIGAR_STAGE_LABELS[job.currentStage]}</T>
              </>
            )}
            {job.dueAt && (
              <>
                {" "}
                · <T>Due</T> <bdi>{job.dueAt.slice(0, 10)}</bdi>
              </>
            )}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/shop/workshop/jobs">
            <T>All jobs</T>
          </Link>
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}
      <Card>
        <CardHeader>
          <CardTitle>
            <T>Work order</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <div>
            <T>Priority</T>: <T>{job.priority ?? "NORMAL"}</T>
          </div>
          <div>
            <T>Qty</T>: <bdi>{job.qty ?? 1}</bdi>
          </div>
          <div>
            <T>Size</T>: <span dir="auto">{job.sizeLabel || "—"}</span>
          </div>
          <div>
            <T>Purity</T>: <bdi>{job.purity || "—"}</bdi>
          </div>
          <div>
            <T>Metal colour</T>: <T>{job.metalColor || "—"}</T>
          </div>
          <div>
            <T>Notes</T>: <span dir="auto">{job.notes || "—"}</span>
          </div>
        </CardContent>
      </Card>
      <KarigarJobGoldCard
        job={job}
        onChanged={load}
        onEdit={() => {
          /* work-order fields live on this page */
        }}
        onDelete={async () => {
          await karigarApi.deleteJob(job.id);
          window.location.href = "/dashboard/shop/workshop/jobs";
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <T>Receive finished goods</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>
              <T>SKU (optional)</T>
            </Label>
            <Input
              dir="ltr"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <Button onClick={receive} disabled={busy || !!job.inventoryItemId}>
            {job.inventoryItemId ? (
              <T>Already in inventory</T>
            ) : (
              <T>Create inventory item</T>
            )}
          </Button>
          {job.inventoryItemId && (
            <Link
              className="text-sm underline"
              href={`/dashboard/shop/products/${job.inventoryItemId}`}
            >
              <T>Open product</T>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
