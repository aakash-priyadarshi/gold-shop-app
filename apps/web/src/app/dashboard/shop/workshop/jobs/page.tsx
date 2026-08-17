"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import { KARIGAR_STAGE_LABELS, type KarigarStageCode } from "@gold-shop/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

type Workshop = { id: string; name: string; artisan: string };
type Job = {
  id: string;
  product: string;
  artisan: string;
  status: string;
  dueAt?: string | null;
  priority?: string;
  qty?: number;
  currentStage?: KarigarStageCode | null;
  workshopId?: string | null;
};

export default function WorkshopJobsPage() {
  const t = useT();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [product, setProduct] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    karigarApi.getSnapshot().then((res) => {
      const data = res.data ?? res;
      setJobs(data.jobs ?? []);
      setWorkshops(data.workshops ?? []);
      if (!workshopId && data.workshops?.[0]) {
        setWorkshopId(data.workshops[0].id);
      }
    });

  useEffect(() => {
    load().catch((err) =>
      setError(err?.response?.data?.message || "Could not load jobs"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!product.trim() || !workshopId) return;
    const ws = workshops.find((w) => w.id === workshopId);
    setSaving(true);
    setError(null);
    try {
      await karigarApi.createJob({
        product: product.trim(),
        artisan: ws?.artisan || ws?.name || "Karigar",
        workshopId,
        dueAt: dueAt || undefined,
        priority,
        qty: Number(qty) || 1,
      });
      setProduct("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not create job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-tour="workshop-jobs">
          <T>Work orders</T>
        </h1>
        <p className="text-sm text-muted-foreground">
          <T>Manufacturing jobs. Floor only advances the current stage.</T>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <T>New job</T>
          </CardTitle>
          <CardDescription>
            <T>
              Requires a karigar. Issue metal from Metal after you create it.
            </T>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>
              <T>Product</T>
            </Label>
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              <T>Karigar</T>
            </Label>
            <Select value={workshopId} onValueChange={setWorkshopId}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select")} />
              </SelectTrigger>
              <SelectContent>
                {workshops.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span dir="auto">{w.name}</span> (
                    <span dir="auto">{w.artisan}</span>)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              <T>Due</T>
            </Label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              <T>Priority</T>
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                  <SelectItem key={p} value={p}>
                    <T>{p}</T>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              <T>Qty</T>
            </Label>
            <Input
              dir="ltr"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={create}
              disabled={saving || workshops.length === 0}
            >
              <T>Create work order</T>
            </Button>
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-muted-foreground border-b">
              <th className="py-2">
                <T>Product</T>
              </th>
              <th>
                <T>Karigar</T>
              </th>
              <th>
                <T>Stage</T>
              </th>
              <th>
                <T>Due</T>
              </th>
              <th>
                <T>Status</T>
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b">
                <td className="py-2">
                  <Link
                    className="font-medium hover:underline"
                    href={supplyChainHref("job", { id: job.id })}
                  >
                    <span dir="auto">{job.product}</span>
                  </Link>
                </td>
                <td dir="auto">{job.artisan}</td>
                <td>
                  {job.currentStage ? (
                    <T>{KARIGAR_STAGE_LABELS[job.currentStage]}</T>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <bdi>{job.dueAt ? job.dueAt.slice(0, 10) : "—"}</bdi>
                </td>
                <td>
                  <T>{job.status.replaceAll("_", " ")}</T>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            <T>No work orders yet.</T>
          </p>
        )}
      </div>
    </div>
  );
}
