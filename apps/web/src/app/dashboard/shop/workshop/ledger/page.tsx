"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useT } from "@/providers/translation-provider";
import { useState, useEffect } from "react";

const TYPES = [
  "ISSUE",
  "RETURN_FINISHED",
  "RETURN_SPRUE",
  "SCRAP",
  "DUST",
  "ADJUST",
] as const;

export default function WorkshopLedgerPage() {
  const t = useT();
  const [vault, setVault] = useState<Record<string, number>>({});
  const [workshops, setWorkshops] = useState<
    Array<{ id: string; name: string; artisan: string }>
  >([]);
  const [jobs, setJobs] = useState<Array<{ id: string; product: string }>>([]);
  const [type, setType] = useState<(typeof TYPES)[number]>("ISSUE");
  const [weight, setWeight] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [jobId, setJobId] = useState("");
  const [lotId, setLotId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    karigarApi.getSnapshot().then((res) => {
      const data = res.data ?? res;
      setVault(data.vaultReserves ?? {});
      setWorkshops(data.workshops ?? []);
      setJobs(data.jobs ?? []);
      if (!workshopId && data.workshops?.[0])
        setWorkshopId(data.workshops[0].id);
    });

  useEffect(() => {
    load().catch((err) =>
      setError(err?.response?.data?.message || "Could not load metal ledger"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setError(null);
    try {
      await karigarApi.addMovement(
        {
          type,
          weightGrams: Number(weight),
          workshopId: workshopId || undefined,
          lotId: lotId || undefined,
          note: note || undefined,
          metalKey: "goldGrains24k",
        },
        jobId || undefined,
      );
      setWeight("");
      setNote("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Movement failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-tour="workshop-metal">
          <T>Metal ledger</T>
        </h1>
        <p className="text-sm text-muted-foreground">
          <T>
            Issue, return, scrap, and adjust vault metal. Same movements as
            Supply Chain — unexplained loss never returns to the vault.
          </T>
        </p>
      </div>
      <Card data-tour="workshop-metal-vault">
        <CardHeader>
          <CardTitle>
            <T>Vault</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          {Object.entries(vault).map(([key, qty]) => (
            <div key={key}>
              <T>{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</T>:{" "}
              <bdi>{Number(qty).toFixed(3)}</bdi> <T>g</T>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card data-tour="workshop-metal-form">
        <CardHeader>
          <CardTitle>
            <T>Record movement</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>
              <T>Type</T>
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as typeof type)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((movementType) => (
                  <SelectItem key={movementType} value={movementType}>
                    <T>{movementType.replaceAll("_", " ")}</T>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              <T>Weight (g)</T>
            </Label>
            <Input
              dir="ltr"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              <T>Karigar</T>
            </Label>
            <Select value={workshopId} onValueChange={setWorkshopId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workshops.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span dir="auto">{w.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              <T>Job (optional)</T>
            </Label>
            <Select
              value={jobId || "none"}
              onValueChange={(v) => setJobId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <T>None</T>
                </SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    <span dir="auto">{j.product}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              <T>Lot id (optional)</T>
            </Label>
            <Input
              dir="ltr"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              <T>Note</T>
            </Label>
            <Input
              dir="auto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={submit} disabled={!weight}>
            <T>Post movement</T>
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-rose-600">{t(error)}</p>}
    </div>
  );
}
