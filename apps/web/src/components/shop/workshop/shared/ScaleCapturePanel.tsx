"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi } from "@/lib/workshop-api";
import { readPhysicalWorkshopScale, type RawScaleFrame, type WorkshopDevice } from "@/lib/workshop-hardware";
import { GoldScaleSimulator, StoneScaleSimulator } from "@gold-shop/shared";
import { workshopRetryKey, type WorkshopRetryKey } from "@/lib/workshop-retry-key";
import { Scale, AlertTriangle, CheckCircle2, RefreshCw, Cpu, ShieldAlert, Sparkles } from "lucide-react";

export interface ScaleCapturePanelProps {
  purpose?: "GOLD" | "STONE";
  materialKey: string;
  treeId?: string;
  jobId?: string;
  movementKind: string;
  processRunId?: string;
  transferId?: string;
  recoveryContainerId?: string;
  recoveryEventId?: string;
  batchChildId?: string;
  destinationBucket?: string;
  sourceBucket?: string;
  sourceScopeId?: string;
  destinationScopeId?: string;
  onCaptured?: (sessionId: string | null, readingId: string | null, weightGrams: string | null) => void;
  externalConfirm?: boolean;
  onConfirmed?: (result: { journalId: string; inventoryItemId?: string; metalGrams?: string; grossGrams?: number }) => void;
  onRequiresApproval?: () => void;
  allowManualOverride?: boolean;
  canApprove?: boolean;
}

export function ScaleCapturePanel({
  purpose = "GOLD",
  materialKey,
  treeId,
  jobId,
  movementKind,
  processRunId,
  transferId,
  recoveryContainerId,
  recoveryEventId,
  batchChildId,
  destinationBucket,
  sourceBucket,
  sourceScopeId,
  destinationScopeId,
  onCaptured,
  onConfirmed,
  onRequiresApproval,
  externalConfirm = false,
  allowManualOverride = false,
  canApprove = false,
}: ScaleCapturePanelProps) {
  const t = useT();
  const [devices, setDevices] = useState<WorkshopDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assignedSequence, setAssignedSequence] = useState<number | null>(null);
  const [samples, setSamples] = useState<RawScaleFrame[] | undefined>();
  const [readingAt, setReadingAt] = useState<string | undefined>();
  const retry = useRef<WorkshopRetryKey | null>(null);
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;
  const [scaleState, setScaleState] = useState<"disconnected" | "connecting" | "unstable" | "stable" | "captured" | "error">("disconnected");
  const [liveWeight, setLiveWeight] = useState<string>("0.00");
  const [liveRawFrame, setLiveRawFrame] = useState<string>("");
  const [isStable, setIsStable] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [capturedWeight, setCapturedWeight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");

  // Manual Override State (Owner only)
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [overrideWeight, setOverrideWeight] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Load registered devices and check simulator support
  const loadDevices = useCallback(async () => {
    try {
      const res = await workshopApi.catalog();
      const devList = (res.data?.devices || []) as WorkshopDevice[];
      const matching = devList.filter((d) => d.purpose === purpose);
      setDevices(matching);
      setSelectedDeviceId((current) => matching.some((d) => d.id === current) ? current : matching[0]?.id || "");
    } catch {
      // ignore
    }
  }, [purpose]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    setSessionId(null);
    setAssignedSequence(null);
    setReadingId(null);
    setConfirmed(false);
    setCapturedWeight(null);
    setLiveWeight("0.00");
    setLiveRawFrame("");
    setSamples(undefined);
    setReadingAt(undefined);
    setIsStable(false);
    setScaleState("disconnected");
    setErrorMessage(null);
    setExceptionReason("");
    retry.current = null;
    onCapturedRef.current?.(null, null, null);
  }, [treeId, jobId, materialKey, movementKind, processRunId, transferId, recoveryContainerId, recoveryEventId, batchChildId, destinationBucket, sourceBucket, sourceScopeId, destinationScopeId, selectedDeviceId]);

  // Read scale frames
  const handleReadScale = useCallback(async () => {
    setErrorMessage(null);
    setScaleState("connecting");

    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device) {
      setScaleState("disconnected");
      setErrorMessage(t("No active scale device selected. Register or select a scale."));
      return;
    }
    if (device.adapterKind === "SIMULATOR") {
        try {
          setScaleState("unstable");
          const sim = purpose === "STONE" ? new StoneScaleSimulator("5.250") : new GoldScaleSimulator("100.25");
          sim.connect();
          sim.setStable(false);
          const unstableReading = sim.read();
          if (unstableReading) {
            setLiveRawFrame(unstableReading.rawFrame);
            setLiveWeight(unstableReading.weightGrams);
            setIsStable(false);
          }

          await new Promise((r) => setTimeout(r, 600));
          sim.setStable(true);
          const stableReading = sim.read();
          if (stableReading) {
            setLiveRawFrame(stableReading.rawFrame);
            setLiveWeight(stableReading.weightGrams);
            setIsStable(true);
            setScaleState("stable");
            setSamples(undefined);
            setReadingAt(new Date().toISOString());
          }
        } catch (err: any) {
          setScaleState("error");
          setErrorMessage(err?.message || "Simulator error");
        }
      return;
    }

    try {
      setScaleState("unstable");
      const res = await readPhysicalWorkshopScale(device);
      setLiveRawFrame(res.rawFrame);
      setSamples(res.samples);
      setReadingAt(res.readingAt);
      setLiveWeight(res.weightGrams);
      setIsStable(res.stable);
      setScaleState(res.stable ? "stable" : "unstable");
    } catch (err: any) {
      setScaleState("error");
      setErrorMessage(err?.message || t("Scale read failed. Check serial/TCP cable connection."));
    }
  }, [devices, selectedDeviceId, purpose, t]);

  // Open weighing session and capture reading
  const handleCapture = async () => {
    if (!materialKey || !movementKind || !selectedDeviceId) {
      setErrorMessage(t("Please select a material and registered scale before capturing weight"));
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Create or reuse movement session
      let currentSessionId = sessionId;
      let sequence = assignedSequence;
      if (!currentSessionId) {
        const sessionRes = await workshopApi.createSession({
          treeId,
          jobId,
          movementKind,
          materialKey,
          processRunId,
          transferId,
          recoveryContainerId,
          recoveryEventId,
          batchChildId,
          disposition: destinationBucket as "VAULT" | "WIP" | "REUSABLE" | "SCRAP" | "RECOVERY_PENDING" | "REFINERY" | "FINISHED" | undefined,
          deviceId: selectedDeviceId,
        });
        currentSessionId = sessionRes.data.id;
        setSessionId(currentSessionId);
        setAssignedSequence(sessionRes.data.assignedSequence);
        sequence = sessionRes.data.assignedSequence;
      }

      // 2. Persist stable scale reading
      const captureRes = await workshopApi.capture(currentSessionId, {
        deviceId: selectedDeviceId,
        reading: {
          rawFrame: liveRawFrame,
          weightGrams: liveWeight,
          unit: "g",
          stable: isStable,
          sequence: sequence!,
          readingAt,
          samples,
        },
      });

      const newReadingId = captureRes.data.reading.id;
      setReadingId(newReadingId);
      setCapturedWeight(liveWeight);
      setScaleState("captured");
      if (onCaptured) {
        onCaptured(currentSessionId, newReadingId, liveWeight);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t("Failed to capture reading"));
      setScaleState("error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId || !readingId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await workshopApi.confirm(sessionId, { readingId, exceptionReason: movementKind === "TRANSFER_RECEIPT" ? exceptionReason.trim() || undefined : undefined });
      if ("requiresApproval" in res.data) {
        setErrorMessage(t("Transfer difference requires supervisor approval. Keep this reading and confirm again after approval."));
        onRequiresApproval?.();
        return;
      }
      setConfirmed(true);
      onConfirmed?.({ journalId: res.data.journal.id, inventoryItemId: res.data.inventoryItem?.id });
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t("Movement confirmation failed"));
    } finally {
      setLoading(false);
    }
  };

  // Submit manual override (Owner only)
  const handleManualOverride = async () => {
    if (!overrideWeight || parseFloat(overrideWeight) <= 0) {
      setErrorMessage(t("Enter a positive physical weight for manual override"));
      return;
    }
    if (!overrideReason.trim()) {
      setErrorMessage(t("Manual override requires an explicit verified operational reason"));
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await workshopApi.manualMovement({
        materialKey,
        sourceBucket: sourceBucket ?? "VAULT",
        destinationBucket: destinationBucket ?? "WIP",
        sourceScopeId,
        destinationScopeId,
        weightGrams: overrideWeight,
        reason: overrideReason.trim(),
        treeId,
        jobId,
        processRunId,
        idempotencyKey: (retry.current = workshopRetryKey(retry.current,
          { materialKey, sourceBucket, destinationBucket, sourceScopeId, destinationScopeId, overrideWeight, overrideReason, treeId, jobId, processRunId },
          () => crypto.randomUUID())).key,
      });
      retry.current = null;
      setShowManualOverride(false);
      if (onConfirmed) {
        onConfirmed({ journalId: res.data.id, metalGrams: overrideWeight });
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t("Manual override failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-950/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-base font-semibold">
              {purpose === "GOLD" ? <T>Gold Scale (0.01g)</T> : <T>Stone Scale (0.001g)</T>}
            </CardTitle>
          </div>
          <Badge
            variant={
              scaleState === "stable" || scaleState === "captured"
                ? "default"
                : scaleState === "unstable" || scaleState === "connecting"
                ? "secondary"
                : "destructive"
            }
            className="capitalize text-xs font-mono"
          >
            {scaleState === "stable" && <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />}
            {scaleState}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          <T>Authoritative physical scale reading directly from hardware port</T>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Device Selection */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5"
            >
              {devices.map((d) => {
                const transport = d.profile?.transport as Record<string, any> | undefined;
                const portStr = transport?.port ? ` - ${transport.port}` : transport?.host ? ` - ${transport.host}` : "";
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.adapterKind}{portStr})
                  </option>
                );
              })}
              {!devices.length && <option value=""><T>No registered scale</T></option>}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={handleReadScale} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scaleState === "connecting" ? "animate-spin" : ""}`} />
            <T>Read</T>
          </Button>

        </div>

        {/* Live Net Weight Digital Display */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-500/10 to-amber-500/5 p-4 text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            <T>Net Authoritative Weight</T>
          </div>
          <div className="font-mono text-4xl font-extrabold tracking-tight text-amber-950 dark:text-amber-100">
            {capturedWeight ? capturedWeight : liveWeight}{" "}
            <span className="text-lg font-normal text-muted-foreground">g</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${isStable ? "bg-emerald-500" : "bg-amber-400 animate-ping"}`} />
            <span className="font-mono text-muted-foreground">
              {isStable ? <T>STABLE READING</T> : <T>UNSTABLE - WAITING FOR SCALE</T>}
            </span>
          </div>
          {liveRawFrame && (
            <div className="mt-2 font-mono text-[10px] text-muted-foreground/80 truncate px-2 py-0.5 bg-background/50 rounded">
              <T>Raw:</T> {liveRawFrame}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            disabled={!isStable || scaleState === "captured" || loading}
            onClick={handleCapture}
          >
            {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {scaleState === "captured" ? <T>Captured</T> : <T>Capture Scale Weight</T>}
          </Button>

          {readingId && !externalConfirm && (
            <Button variant="outline" disabled={loading || !canApprove || confirmed} onClick={handleConfirm}>
              {confirmed ? <T>Confirmed</T> : <T>Confirm movement</T>}
            </Button>
          )}

          {readingId && !confirmed && (
            <Button variant="ghost" disabled={loading} onClick={() => {
              setSessionId(null);
              setAssignedSequence(null);
              setReadingId(null);
              setCapturedWeight(null);
              setLiveRawFrame("");
              setSamples(undefined);
              setReadingAt(undefined);
              setIsStable(false);
              setScaleState("disconnected");
              setExceptionReason("");
              retry.current = null;
              onCaptured?.(null, null, null);
            }}><T>Discard reading</T></Button>
          )}

          {allowManualOverride && (
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
              onClick={() => setShowManualOverride(!showManualOverride)}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
              <T>Override</T>
            </Button>
          )}
        </div>

        {movementKind === "TRANSFER_RECEIPT" && readingId && !confirmed && (
          <div><Label className="text-xs"><T>Difference reason if outside tolerance</T></Label><Input value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} placeholder={t("Verified reason for transfer difference")} /></div>
        )}

        {/* Owner Manual Override Section */}
        {showManualOverride && allowManualOverride && (
          <div className="rounded-lg border-2 border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4" />
              <T>EXCEPTIONAL DANGEROUS ACTION: Owner Manual Override</T>
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-400">
              <T>Only use when scale hardware is verified offline. This typed weight bypasses scale frame verification and is permanently logged in audit reports.</T>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-rose-900 dark:text-rose-200"><T>Physical Grams</T></Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={overrideWeight}
                  onChange={(e) => setOverrideWeight(e.target.value)}
                  className="h-8 text-xs border-rose-300 bg-white dark:bg-gray-900 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-rose-900 dark:text-rose-200"><T>Audit Reason</T></Label>
                <Input
                  placeholder={t("Scale hardware outage verified by owner")}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="h-8 text-xs border-rose-300 bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs"
              disabled={loading || !overrideWeight || !overrideReason}
              onClick={handleManualOverride}
            >
              <T>Post Authoritative Manual Override</T>
            </Button>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
