"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { karigarApi } from "@/lib/api";
import { workshopApi } from "@/lib/workshop-api";
import { useT } from "@/providers/translation-provider";
import {
  GoldScaleSimulator,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
} from "@gold-shop/shared";
import { useCallback, useEffect, useRef, useState } from "react";

type TreeOption = {
  id: string;
  label: string;
  jobId: string;
  jobProduct: string;
  expectedGrams?: number;
};

type LiveReading = {
  weightGrams: string;
  stable: boolean;
  sequence: number;
  rawFrame: string;
  readingAt: string;
  unit: "g";
};

export function confirmIssuePayload(readingId: string, idempotencyKey: string) {
  return { readingId, idempotencyKey };
}

function simulatorSequenceKey(deviceId: string) {
  return `orivraa:workshop-scale:${deviceId}:sequence`;
}

let transientSimulatorSequence = Date.now() % 2_000_000_000;

function readSimulatorSequence(deviceId: string): number {
  try {
    const parsed = Number(window.localStorage.getItem(simulatorSequenceKey(deviceId)));
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return transientSimulatorSequence;
  }
}

function saveSimulatorSequence(deviceId: string, sequence: number) {
  try {
    window.localStorage.setItem(simulatorSequenceKey(deviceId), String(sequence));
  } catch {
    // A simulator remains usable in privacy-restricted browsers; the server still
    // rejects any duplicated device/sequence pair.
    transientSimulatorSequence = Math.max(transientSimulatorSequence, sequence);
  }
}

export function CaptureWeightDialog() {
  const t = useT();
  const simulatorRef = useRef<GoldScaleSimulator | null>(null);
  const [trees, setTrees] = useState<TreeOption[]>([]);
  const [treeId, setTreeId] = useState("");
  const [vaultGrams, setVaultGrams] = useState("0.000000");
  const [wipGrams, setWipGrams] = useState("0.000000");
  const [simulatorAllowed, setSimulatorAllowed] = useState(false);
  const [cutoverReady, setCutoverReady] = useState<boolean | null>(null);
  const [openingGrams, setOpeningGrams] = useState("");
  const [openingSource, setOpeningSource] = useState("");
  const [openingReason, setOpeningReason] = useState("");
  const [openingConfirmed, setOpeningConfirmed] = useState(false);
  const openingKey = useRef<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState<LiveReading | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{
    readingId: string;
    weightGrams: string;
    deviceId: string;
    stable: boolean;
    treeLabel: string;
    jobProduct: string;
    actorUserId: string | null;
  } | null>(null);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settleTicks = useRef(0);

  const load = useCallback(async () => {
    const jobsRes = await workshopApi.jobs();
    const jobs = jobsRes.data ?? [];
    const nextTrees: TreeOption[] = [];
    for (const job of jobs) {
      for (const tree of job.trees ?? []) {
        // A fresh existing tree can receive its first traceable Gold 995 issue.
        // Trees with legacy issued metal stay out of this picker; the API repeats
        // that check so the browser is never the enforcement boundary.
        if (
          tree.metalKey === WORKSHOP_GOLD_995_MATERIAL_KEY ||
          (job.metalKey === WORKSHOP_GOLD_995_MATERIAL_KEY &&
            Number(tree.issuedGrams ?? 0) === 0)
        ) {
          nextTrees.push({
            id: tree.id,
            label: tree.label || "",
            jobId: job.id,
            jobProduct: job.product,
            expectedGrams: (tree.lines ?? []).reduce(
              (sum: number, line: { weightGrams?: number }) =>
                sum + Number(line.weightGrams ?? 0),
              0,
            ),
          });
        }
      }
    }
    setTrees(nextTrees);
    if (!treeId && nextTrees[0]) setTreeId(nextTrees[0].id);
    try {
      const cutoverRes = await karigarApi.workshopCutoverStatus();
      const cutover = cutoverRes.data ?? cutoverRes;
      setCutoverReady(cutover.ready === true);
      const accRes = await karigarApi.workshopMetalAccounts();
      const acc = accRes.data ?? accRes;
      const vault = acc.accounts?.find((a: { systemKey: string }) => a.systemKey === "GOLD995_VAULT");
      const wip = (acc.accounts ?? []).filter((a: { materialKey: string; bucket: string }) => a.materialKey === WORKSHOP_GOLD_995_MATERIAL_KEY && a.bucket === "WIP");
      setVaultGrams(vault?.balanceGrams ?? "0.000000");
      setWipGrams(wip.reduce((sum: number, account: { balanceGrams: string }) => sum + Number(account.balanceGrams), 0).toFixed(6));
      setSimulatorAllowed(acc.simulatorAllowed === true);
    } catch {
      // accounts endpoint requires TRACEABLE; ignore until enabled
    }
  }, [treeId]);

  useEffect(() => {
    load().catch((err) =>
      setError(err?.response?.data?.message || "Could not load workshop metal"),
    );
  }, [load]);

  useEffect(() => {
    if (!connected || !simulatorRef.current) return;
    const sim = simulatorRef.current;
    const timer = setInterval(() => {
      settleTicks.current += 1;
      if (settleTicks.current >= 3) {
        sim.setStable(true);
      }
      const reading = sim.read();
      if (reading) {
        if (deviceId) saveSimulatorSequence(deviceId, reading.sequence);
        setLive({
          weightGrams: reading.weightGrams,
          stable: reading.stable === true,
          sequence: reading.sequence,
          rawFrame: reading.rawFrame,
          readingAt: reading.readingAt,
          unit: "g",
        });
      }
    }, 400);
    return () => clearInterval(timer);
  }, [connected, deviceId]);

  const connectSimulator = async () => {
    setError(null);
    setBusy(true);
    try {
      const deviceRes = await karigarApi.workshopSimulatorDevice();
      const device = deviceRes.data ?? deviceRes;
      setDeviceId(device.id);
      const sim = new GoldScaleSimulator(
        "100.25",
        readSimulatorSequence(device.id),
      );
      sim.setStable(false);
      sim.connect();
      simulatorRef.current = sim;
      settleTicks.current = 0;
      setConnected(true);
      setCaptured(null);
      setJournalId(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not connect Gold Scale simulator");
    } finally {
      setBusy(false);
    }
  };

  const postOpening = async () => {
    if (!openingConfirmed || !openingGrams || !openingSource.trim() || !openingReason.trim()) return;
    setError(null);
    setBusy(true);
    try {
      openingKey.current ??= window.crypto.randomUUID();
      await karigarApi.workshopManualOpening({
        materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
        weightGrams: openingGrams,
        source: openingSource.trim(),
        reason: openingReason.trim(),
        confirmedPhysicalGold995: true,
        idempotencyKey: openingKey.current,
      });
      openingKey.current = null;
      setOpeningGrams("");
      setOpeningSource("");
      setOpeningReason("");
      setOpeningConfirmed(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not post opening balance");
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    if (!live || live.stable !== true || !deviceId || !treeId) return;
    setError(null);
    setBusy(true);
    try {
      const tree = trees.find((item) => item.id === treeId);
      if (!tree) {
        setError("Select a valid casting tree before capturing weight");
        return;
      }
      const sessionRes = await karigarApi.createWeighingSession({
        treeId,
        jobId: tree.jobId,
        deviceId,
      });
      const session = sessionRes.data ?? sessionRes;
      setSessionId(session.id);
      const capturedRes = await karigarApi.captureWeighingSession(session.id, {
        deviceId,
        reading: {
          weightGrams: live.weightGrams,
          unit: "g",
          stable: live.stable,
          sequence: session.assignedSequence ?? live.sequence,
          rawFrame: live.rawFrame,
          readingAt: live.readingAt,
        },
      });
      const body = capturedRes.data ?? capturedRes;
      setCaptured({
        readingId: body.reading.id,
        weightGrams: body.reading.weightGrams,
        deviceId,
        stable: body.reading.stable,
        treeLabel: tree.label,
        jobProduct: tree.jobProduct,
        actorUserId: body.reading.actorUserId ?? null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not capture scale reading");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!sessionId || !captured) return;
    setError(null);
    setBusy(true);
    try {
      const postedRes = await karigarApi.confirmWeighingSession(
        sessionId,
        confirmIssuePayload(captured.readingId, `confirm:${captured.readingId}`),
      );
      const posted = postedRes.data ?? postedRes;
      setJournalId(posted.journal.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not post metal journal");
    } finally {
      setBusy(false);
    }
  };

  const discardReading = () => {
    setSessionId(null);
    setCaptured(null);
    setLive(null);
    setError(null);
  };

  return (
    <Card data-tour="workshop-gold995-capture">
      <CardHeader>
        <CardTitle>
          <T>Gold 995 — Capture Weight</T>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          <T>Gold 995 is not 24K / 999 vault gold. Actual grams come from a connected Gold Scale. Tare on the device; software does not subtract a tray weight.</T>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <T>Gold 995 vault</T>: <bdi>{vaultGrams}</bdi> <T>g</T>
          </div>
          <div>
            <T>Casting WIP</T>: <bdi>{wipGrams}</bdi> <T>g</T>
          </div>
        </div>
        <div className="space-y-1">
          <Label>
            <T>Casting tree / batch</T>
          </Label>
          <Select
            value={treeId || "none"}
            disabled={busy || (!!captured && !journalId)}
            onValueChange={(v) => {
              setTreeId(v === "none" ? "" : v);
              setSessionId(null);
              setCaptured(null);
              setJournalId(null);
              setLive(null);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <T>Select tree</T>
              </SelectItem>
              {trees.map((tree) => (
                <SelectItem key={tree.id} value={tree.id}>
                  <span dir="auto">
                    {tree.jobProduct} — {/* i18n-user-content: operator-entered casting tree label */ tree.label || <T>Tree</T>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(() => {
          const selectedTree = trees.find((tree) => tree.id === treeId);
          return selectedTree?.expectedGrams && selectedTree.expectedGrams > 0 ? (
            <p className="text-sm text-muted-foreground">
              <T>CAD/reference total</T>: {selectedTree.expectedGrams.toFixed(3)} g ·{" "}
              <T>reference only — it does not post metal stock</T>
            </p>
          ) : null;
        })()}
        {cutoverReady === false && (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/30" data-testid="workshop-cutover">
            <p className="text-sm font-semibold"><T>TRACEABLE setup — physical Gold 995 opening stock</T></p>
            <p className="text-sm"><T>Only the owner or admin may enter a controlled opening balance. Physically verify the stock first. Gold 995 is not 24K / 999 gold; this manual entry is permanently flagged in the journal and audit log.</T></p>
            <Label htmlFor="workshop-opening-grams"><T>Physical Gold 995 net grams (0.01 g)</T></Label>
            <Input id="workshop-opening-grams" inputMode="decimal" value={openingGrams} onChange={(event) => { setOpeningGrams(event.target.value); openingKey.current = null; }} />
            <Label htmlFor="workshop-opening-source"><T>Stock source / reference</T></Label>
            <Input id="workshop-opening-source" value={openingSource} onChange={(event) => { setOpeningSource(event.target.value); openingKey.current = null; }} />
            <Label htmlFor="workshop-opening-reason"><T>Migration reason</T></Label>
            <Input id="workshop-opening-reason" value={openingReason} onChange={(event) => { setOpeningReason(event.target.value); openingKey.current = null; }} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={openingConfirmed} onChange={(event) => setOpeningConfirmed(event.target.checked)} />
              <T>I confirm this was physically checked as Gold 995, not existing 24K / 999 vault stock.</T>
            </label>
            <Button type="button" onClick={postOpening} disabled={busy || !openingConfirmed || !openingGrams || !openingSource.trim() || !openingReason.trim()}>
              <T>Post audited opening balance</T>
            </Button>
          </div>
        )}
        {simulatorAllowed && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={connectSimulator} disabled={busy || cutoverReady !== true || (!!captured && !journalId)}>
              {connected ? <T>Simulator connected</T> : <T>Connect Gold Scale simulator</T>}
            </Button>
          </div>
        )}
        <div
          className="rounded-lg border p-3 text-sm"
          data-testid="scale-live-reading"
        >
          {!connected && (
            <p className="text-muted-foreground">
              <T>Scale disconnected</T>
            </p>
          )}
          {connected && live && (
            <>
              <p>
                <T>Scale</T> <span dir="ltr">{deviceId}</span> · <T>Gold</T> · 0.01 g
              </p>
              <p>
                <T>Live</T> <bdi>{live.weightGrams}</bdi> g
              </p>
              <p data-testid="scale-stable-flag">
                {live.stable ? <T>Stable</T> : <T>Unstable — wait for the reading to settle</T>}
              </p>
            </>
          )}
        </div>
        <Button
          type="button"
          onClick={capture}
          disabled={busy || cutoverReady !== true || !connected || !treeId || !!captured || !!journalId || live?.stable !== true}
        >
          <T>Capture Weight</T>
        </Button>
        {captured && !journalId && (
          <div className="space-y-2 rounded-lg border p-3" data-testid="scale-confirm">
            <p>
              <T>Confirm Gold 995 issue</T>
            </p>
            <p>
              <T>Actual</T> <bdi>{captured.weightGrams}</bdi> g
            </p>
            <p dir="auto">
              <T>Batch / tree</T>: {captured.jobProduct} — {/* i18n-user-content: captured operator-entered tree label */ captured.treeLabel || <T>Tree</T>}
            </p>
            <p>
              <T>Scale</T> {captured.deviceId} · <T>Gold</T>
            </p>
            {captured.actorUserId && (
              <p><T>Operator</T>: <span dir="ltr">{captured.actorUserId}</span></p>
            )}
            <div className="flex gap-2">
              <Button type="button" onClick={confirm} disabled={busy}>
                <T>Confirm</T>
              </Button>
              <Button type="button" variant="outline" onClick={discardReading} disabled={busy}>
                <T>Discard reading</T>
              </Button>
            </div>
          </div>
        )}
        {journalId && (
          <div className="space-y-2" data-testid="scale-success">
            <p><T>Posted metal journal</T> <span dir="ltr">{journalId}</span></p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSessionId(null);
                setCaptured(null);
                setJournalId(null);
                setLive(null);
              }}
            >
              <T>New Gold 995 issue</T>
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{t(error)}</p>}
      </CardContent>
    </Card>
  );
}
