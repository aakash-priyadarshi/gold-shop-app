"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoldScaleSimulator, StoneScaleSimulator, assertPositiveQuantumGrams } from "@gold-shop/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi } from "@/lib/workshop-api";
import { workshopRetryKey, type WorkshopRetryKey } from "@/lib/workshop-retry-key";
import { listWorkshopSerialPorts, readPhysicalWorkshopScale, type RawScaleFrame, type WorkshopDevice } from "@/lib/workshop-hardware";
import { FactoryManagerControls } from "./FactoryManagerControls";
import { WorkshopReportView } from "./WorkshopReportView";

type Material = { id: string; key: string; name: string; scalePurpose: "GOLD" | "STONE"; effectivePurity?: string | null };
type Recipe = { id: string; name: string; version: number; targetFineGoldFraction: string };
type Definition = { id: string; name: string; department?: string | null };
type Route = { id: string; name: string };
type Workstation = { id: string; name: string; definitionId?: string | null };
type Run = { id: string; treeId: string; batchChildId?: string | null; status: string; recipeId?: string | null; definitionId: string };
type Tree = { id: string; label: string; metalKey: string; lines: Array<{ id: string; weightGrams: number }> };
type Job = { id: string; product: string; trees: Tree[]; workshopProcessRuns: Run[]; workshopBatchChildren: Array<{ id: string; label: string; treeId: string }>; workshopRouteSteps: Array<{ id: string; definitionId: string; status: string; position: number }> };
type Transfer = { id: string; status: string; treeId: string; materialKey: string; differenceGrams?: string | null; fromDepartment: string; toDepartment: string };
type Bag = { id: string; code: string; materialKey: string; status: string; expectedBalanceGrams: string; events: Array<{ id: string; status: string }> };
type Live = { weightGrams: string; rawFrame: string; readingAt: string; stable: boolean; samples?: RawScaleFrame[] };

const MOVEMENTS = [
  "MATERIAL_ISSUE", "ADDITIONAL_ISSUE", "PROCESS_INPUT", "MIXED_OUTPUT", "PROCESS_OUTPUT",
  "TRANSFER_DISPATCH", "TRANSFER_RECEIPT", "RECOVERY_DEPOSIT", "RECOVERY_SEND", "RECOVERY_RESULT",
  "STONE_SETTING", "STONE_RETURN", "FINISHED_RECEIPT",
] as const;
type Movement = typeof MOVEMENTS[number];

const fieldClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const body = (response: { data: any }) => response.data ?? response;
const message = (error: any) => String(error?.response?.data?.message ?? error?.message ?? "Workshop request failed");

export function FactoryWorkbench({ staffMode = false, canApprove = true }: { staffMode?: boolean; canApprove?: boolean } = {}) {
  const t = useT();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [devices, setDevices] = useState<WorkshopDevice[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; materialKey: string; bucket: string; scopeId: string; balanceGrams: string }>>([]);
  const [simulatorAllowed, setSimulatorAllowed] = useState(false);
  const [jobId, setJobId] = useState("");
  const [treeId, setTreeId] = useState("");
  const [runId, setRunId] = useState("");
  const [movement, setMovement] = useState<Movement>("MATERIAL_ISSUE");
  const [materialKey, setMaterialKey] = useState("goldGrains995");
  const [deviceId, setDeviceId] = useState("");
  const [disposition, setDisposition] = useState("WIP");
  const [transferId, setTransferId] = useState("");
  const [bagId, setBagId] = useState("");
  const [eventId, setEventId] = useState("");
  const [childId, setChildId] = useState("");
  const [session, setSession] = useState<{ id: string; assignedSequence: number; requiredPurpose: "GOLD" | "STONE" } | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [scaleState, setScaleState] = useState<"disconnected" | "connecting" | "unstable" | "stable" | "captured" | "error">("disconnected");
  const [readingId, setReadingId] = useState("");
  const [posted, setPosted] = useState<{ journalId: string; inventoryItemId?: string; metalGrams?: string; grossGrams?: number } | null>(null);
  const [demoWeight, setDemoWeight] = useState("100.25");
  const [finishedName, setFinishedName] = useState("");
  const [finishedType, setFinishedType] = useState("OTHER");
  const [exceptionReason, setExceptionReason] = useState("");
  const [approvalNotice, setApprovalNotice] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [devicePurpose, setDevicePurpose] = useState<"GOLD" | "STONE">("GOLD");
  const [deviceKind, setDeviceKind] = useState<"SERIAL" | "TCP">("SERIAL");
  const [portOrHost, setPortOrHost] = useState("");
  const [tcpPort, setTcpPort] = useState("4001");
  const [baudRate, setBaudRate] = useState("9600");
  const [dataBits, setDataBits] = useState("8");
  const [stopBits, setStopBits] = useState("1");
  const [parity, setParity] = useState("none");
  const [stableToken, setStableToken] = useState("ST");
  const [unstableToken, setUnstableToken] = useState("US");
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [processName, setProcessName] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [routeStepId, setRouteStepId] = useState("");
  const [workstationId, setWorkstationId] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [targetPurity, setTargetPurity] = useState("0.916667");
  const [recipeId, setRecipeId] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [recommendation, setRecommendation] = useState<any>(null);
  const [bagCode, setBagCode] = useState("");
  const [fromDepartment, setFromDepartment] = useState("");
  const [toDepartment, setToDepartment] = useState("");
  const [openingWeight, setOpeningWeight] = useState("");
  const [openingMaterialKey, setOpeningMaterialKey] = useState("masterAlloy");
  const [openingSource, setOpeningSource] = useState("");
  const [openingReason, setOpeningReason] = useState("");
  const openingRetry = useRef<WorkshopRetryKey | null>(null);
  const [supervisorReason, setSupervisorReason] = useState("");
  const [excessSourceAccountId, setExcessSourceAccountId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [jobResponse, catalogResponse, accountResponse, transferResponse, bagResponse] = await Promise.all([
      workshopApi.jobs(), workshopApi.catalog(), workshopApi.accounts(), workshopApi.transfers(), workshopApi.recoveryBags(),
    ]);
    const catalog = body(catalogResponse);
    const account = body(accountResponse);
    setJobs(body(jobResponse));
    setMaterials(catalog.materials ?? []);
    setRecipes(catalog.recipes ?? []);
    setDefinitions(catalog.processes ?? []);
    setRoutes(catalog.routes ?? []);
    setWorkstations(catalog.workstations ?? []);
    setDevices(catalog.devices ?? []);
    setAccounts(account.accounts ?? []);
    setSimulatorAllowed(account.simulatorAllowed === true);
    setTransfers(body(transferResponse));
    setBags(body(bagResponse));
  }, []);

  useEffect(() => { refresh().catch((err) => setError(message(err))); }, [refresh]);
  const selectedJob = jobs.find((job) => job.id === jobId);
  const selectedTree = selectedJob?.trees.find((tree) => tree.id === treeId);
  const runs = selectedJob?.workshopProcessRuns.filter((run) => run.treeId === treeId) ?? [];
  const selectedRun = runs.find((run) => run.id === runId);
  const mixedKey = selectedRun ? `mix_${selectedRun.id.replace(/-/g, "")}` : "";
  const selectedMaterial = materials.find((material) => material.key === materialKey);
  const purpose = movement === "MIXED_OUTPUT" ? "GOLD" : selectedMaterial?.scalePurpose ?? "GOLD";
  const availableDevices = devices.filter((device) => device.purpose === purpose);
  const selectedDevice = availableDevices.find((device) => device.id === deviceId);
  const selectedBag = bags.find((bag) => bag.id === bagId);
  const currentMaterialKey = movement === "MIXED_OUTPUT" ? mixedKey : materialKey;
  const matchingTransfers = transfers.filter((transfer) => transfer.treeId === treeId && transfer.materialKey === currentMaterialKey);
  const selectedTransfer = transfers.find((transfer) => transfer.id === transferId);
  const excessReceipt = selectedTransfer?.differenceGrams?.startsWith("-") === true;
  const childOptions = selectedJob?.workshopBatchChildren.filter((child) => child.treeId === treeId) ?? [];
  const needsRun = ["ADDITIONAL_ISSUE", "PROCESS_INPUT", "MIXED_OUTPUT", "PROCESS_OUTPUT", "RECOVERY_DEPOSIT"].includes(movement);
  const needsTransfer = movement.startsWith("TRANSFER_");
  const needsBag = movement.startsWith("RECOVERY_") || (movement === "PROCESS_OUTPUT" && disposition === "RECOVERY_PENDING");
  const needsEvent = movement === "RECOVERY_SEND" || movement === "RECOVERY_RESULT";
  const accountRows = useMemo(() => accounts.filter((account) => account.balanceGrams !== "0.000000"), [accounts]);

  const act = async (action: () => Promise<unknown>, after = true) => {
    setError(""); setBusy(true);
    try { await action(); if (after) await refresh(); return true; }
    catch (err) { setError(message(err)); return false; }
    finally { setBusy(false); }
  };

  const postMaterialOpening = async () => {
    const payload = { materialKey: openingMaterialKey, weightGrams: openingWeight,
      source: openingSource.trim(), reason: openingReason.trim() };
    openingRetry.current = workshopRetryKey(openingRetry.current, payload, () => crypto.randomUUID());
    const key = openingRetry.current.key;
    if (await act(() => workshopApi.materialOpening({ ...payload, idempotencyKey: key }))) {
      openingRetry.current = null;
      setOpeningWeight("");
      setOpeningReason("");
    }
  };

  const newSession = () => act(async () => {
    if (!treeId || !deviceId || !currentMaterialKey || (needsRun && !runId) || (needsTransfer && !transferId) || (needsBag && !bagId) || (needsEvent && !eventId)) {
      throw new Error("Select the tree, scale and required process/transfer/recovery context");
    }
    const created = body(await workshopApi.createSession({
      movementKind: movement, materialKey: currentMaterialKey, deviceId, jobId,
      treeId, ...(runId && (needsRun || ["TRANSFER_DISPATCH", "TRANSFER_RECEIPT", "STONE_SETTING", "STONE_RETURN", "FINISHED_RECEIPT"].includes(movement)) ? { processRunId: runId } : {}),
      ...(transferId && needsTransfer ? { transferId } : {}),
      ...(bagId && needsBag ? { recoveryContainerId: bagId } : {}),
      ...(eventId && needsEvent ? { recoveryEventId: eventId } : {}),
      ...(childId ? { batchChildId: childId } : {}),
      ...(movement === "PROCESS_OUTPUT" || movement === "RECOVERY_RESULT" ? { disposition } : {}),
    }));
    setSession(created); setLive(null); setScaleState("disconnected"); setReadingId(""); setPosted(null); setApprovalNotice("");
  }, false);

  const readScale = () => act(async () => {
    if (!session || !selectedDevice) throw new Error("Create a weighing session and select its registered scale first");
    setScaleState("connecting");
    try {
    if (selectedDevice.adapterKind === "SIMULATOR") {
      if (!simulatorAllowed) throw new Error("Simulator is not authorized for this shop");
      assertPositiveQuantumGrams(demoWeight, purpose);
      const simulator = purpose === "GOLD" ? new GoldScaleSimulator(demoWeight) : new StoneScaleSimulator(demoWeight);
      simulator.connect(); simulator.setStable(true);
      const reading = simulator.read();
      if (!reading) throw new Error("Demo scale is disconnected");
      setLive({ weightGrams: reading.weightGrams, stable: reading.stable, rawFrame: reading.rawFrame, readingAt: reading.readingAt });
    } else {
      const reading = await readPhysicalWorkshopScale(selectedDevice);
      setLive({ ...reading, stable: reading.stable });
    }
    setScaleState("stable");
    } catch (error) {
      setScaleState(String(error).toLowerCase().includes("unstable") ? "unstable" : "error");
      throw error;
    }
  }, false);

  const capture = () => act(async () => {
    if (!session || !live || !selectedDevice || !live.stable) throw new Error("Wait for a stable reading on the selected scale");
    const result = body(await workshopApi.capture(session.id, { deviceId: selectedDevice.id, reading: {
      weightGrams: live.weightGrams, unit: "g", stable: true,
      sequence: session.assignedSequence, rawFrame: live.rawFrame,
      readingAt: live.readingAt, ...(live.samples ? { samples: live.samples } : {}),
    } }));
    setReadingId(result.reading.id);
    setScaleState("captured");
  }, false);

  const confirm = () => act(async () => {
    if (!session || !readingId) throw new Error("Capture a reading before confirming");
    const result = body(await workshopApi.confirm(session.id, {
      readingId, idempotencyKey: `workshop:${movement}:${readingId}`,
      ...(exceptionReason.trim() ? { exceptionReason: exceptionReason.trim() } : {}),
      ...(movement === "FINISHED_RECEIPT" ? { finishedGoods: { nameEn: finishedName.trim(), jewelleryType: finishedType } } : {}),
    }));
    if (result.requiresApproval) { setApprovalNotice(`Difference ${result.differenceGrams} g requires supervisor approval.`); return; }
    setPosted({ journalId: result.journal.id, inventoryItemId: result.inventoryItem?.id,
      metalGrams: movement === "FINISHED_RECEIPT" ? result.journal.weightGrams : undefined,
      grossGrams: result.inventoryItem?.grossWeightGrams });
  });

  const discard = () => { setSession(null); setLive(null); setScaleState("disconnected"); setReadingId(""); setPosted(null); setApprovalNotice(""); setError(""); };

  return (
    <div className="space-y-4" data-tour="workshop-factory-workbench">
      <Card><CardHeader><CardTitle><T>Factory workstation</T></CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground"><T>Choose the batch and movement, read the physical Gold or Stone Scale, then confirm the stored reading. Tare on the device; no software tare is applied.</T></p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><T>Job</T><select className={fieldClass} value={jobId} onChange={(event) => { setJobId(event.target.value); setTreeId(""); setRunId(""); setTransferId(""); setBagId(""); setEventId(""); setChildId(""); discard(); }}><option value="">{t("Select job")}</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.product}</option>)}</select></label>
          <label className="space-y-1 text-sm"><T>Casting tree</T><select className={fieldClass} value={treeId} onChange={(event) => { setTreeId(event.target.value); setRunId(""); setTransferId(""); setBagId(""); setEventId(""); setChildId(""); discard(); }}><option value="">{t("Select tree")}</option>{selectedJob?.trees.map((tree) => <option key={tree.id} value={tree.id}>{tree.label}</option>)}</select></label>
          <label className="space-y-1 text-sm"><T>Physical movement</T><select className={fieldClass} value={movement} onChange={(event) => { const next = event.target.value as Movement; setMovement(next); setDisposition(next === "RECOVERY_RESULT" ? "VAULT" : "WIP"); discard(); }}>{MOVEMENTS.map((kind) => <option key={kind} value={kind}>{t(kind.replaceAll("_", " "))}</option>)}</select></label>
          {movement !== "MIXED_OUTPUT" && <label className="space-y-1 text-sm"><T>Material</T><select className={fieldClass} value={materialKey} onChange={(event) => { setMaterialKey(event.target.value); setDeviceId(""); discard(); }}>{materials.map((material) => <option key={material.key} value={material.key}>{material.name} · {material.scalePurpose}</option>)}</select></label>}
          {movement === "MIXED_OUTPUT" && <p className="rounded border p-2 text-sm"><T>Derived batch material</T>: <span dir="ltr">{mixedKey || t("Select a recipe run")}</span></p>}
          <label className="space-y-1 text-sm"><T>Process run</T><select className={fieldClass} value={runId} onChange={(event) => { const next = runs.find((run) => run.id === event.target.value); setRunId(event.target.value); if (next) setChildId(next.batchChildId ?? ""); discard(); }}><option value="">{t("No process run")}</option>{runs.filter((run) => ["OPEN", "RECONCILIATION_PENDING"].includes(run.status)).map((run) => <option key={run.id} value={run.id}>{definitions.find((definition) => definition.id === run.definitionId)?.name ?? run.id} · {run.id.slice(0, 8)}</option>)}</select></label>
          <label className="space-y-1 text-sm"><T>Scale</T> ({purpose === "GOLD" ? "0.01" : "0.001"} g)<select className={fieldClass} value={deviceId} onChange={(event) => { setDeviceId(event.target.value); discard(); }}><option value="">{t("Select registered scale")}</option>{availableDevices.map((device) => <option key={device.id} value={device.id}>{device.name} · {device.adapterKind}</option>)}</select></label>
          {needsTransfer && <label className="space-y-1 text-sm"><T>Transfer</T><select className={fieldClass} value={transferId} onChange={(event) => { setTransferId(event.target.value); discard(); }}><option value="">{t("Select transfer")}</option>{matchingTransfers.map((transfer) => <option key={transfer.id} value={transfer.id}>{transfer.fromDepartment} → {transfer.toDepartment} · {transfer.status}</option>)}</select></label>}
          {needsBag && <label className="space-y-1 text-sm"><T>Recovery bag</T><select className={fieldClass} value={bagId} onChange={(event) => { setBagId(event.target.value); setEventId(""); discard(); }}><option value="">{t("Select recovery bag")}</option>{bags.map((bag) => <option key={bag.id} value={bag.id}>{bag.code} · {bag.status}</option>)}</select></label>}
          {needsEvent && <label className="space-y-1 text-sm"><T>Recovery event</T><select className={fieldClass} value={eventId} onChange={(event) => { setEventId(event.target.value); discard(); }}><option value="">{t("Select recovery event")}</option>{selectedBag?.events.map((event) => <option key={event.id} value={event.id}>{event.id.slice(0, 8)} · {event.status}</option>)}</select></label>}
          {childOptions.length > 0 && <label className="space-y-1 text-sm"><T>Piece / group</T><select className={fieldClass} value={childId} onChange={(event) => { const next = event.target.value; setChildId(next); if (selectedRun && (selectedRun.batchChildId ?? "") !== next) setRunId(""); discard(); }}><option value="">{t("Whole tree")}</option>{childOptions.map((child) => <option key={child.id} value={child.id}>{child.label}</option>)}</select></label>}
          {(movement === "PROCESS_OUTPUT" || movement === "RECOVERY_RESULT") && <label className="space-y-1 text-sm"><T>Disposition</T><select className={fieldClass} value={disposition} onChange={(event) => { setDisposition(event.target.value); discard(); }}>{(movement === "RECOVERY_RESULT" ? ["VAULT", "REUSABLE", "SCRAP", "REFINERY"] : ["WIP", "VAULT", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY"]).map((value) => <option key={value} value={value}>{t(value.replaceAll("_", " "))}</option>)}</select></label>}
        </div>
        {selectedTree && <p className="text-xs text-muted-foreground"><T>CAD theoretical weight is reference only</T>: {selectedTree.lines.reduce((sum, line) => sum + Number(line.weightGrams || 0), 0).toFixed(3)} g</p>}
        {movement === "FINISHED_RECEIPT" && <div className="grid gap-2 md:grid-cols-2"><label className="space-y-1 text-sm"><T>Finished item name</T><Input value={finishedName} onChange={(event) => setFinishedName(event.target.value)} /></label><label className="space-y-1 text-sm"><T>Jewellery type</T><select className={fieldClass} value={finishedType} onChange={(event) => setFinishedType(event.target.value)}>{["OTHER", "RING", "NECKLACE", "BRACELET", "BANGLE", "EARRING", "PENDANT", "CHAIN", "SET"].map((value) => <option key={value}>{t(value)}</option>)}</select></label><p className="text-xs md:col-span-2"><T>Weigh the whole finished piece on the Gold Scale. Previously set Stone Scale weights for this piece or group are subtracted from gross to record metal grams; check the matching piece or group before confirming. Received inventory remains hidden and unpriced until reviewed.</T></p></div>}
        {selectedDevice?.adapterKind === "SIMULATOR" && simulatorAllowed && <label className="block max-w-xs space-y-1 text-sm"><T>Demo net grams (simulator only)</T><Input inputMode="decimal" value={demoWeight} onChange={(event) => setDemoWeight(event.target.value)} /></label>}
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !!session} onClick={newSession}><T>1. Create session</T></Button><Button variant="outline" disabled={busy || !session || !!readingId} onClick={readScale}><T>2. Read scale</T></Button><Button variant="outline" disabled={busy || !session || !live?.stable || !!readingId} onClick={capture}><T>3. Capture stable reading</T></Button></div>
        <div className="rounded-md border p-3 text-sm"><T>Scale state</T>: {scaleState === "captured" ? <T>Captured</T> : scaleState === "stable" ? <T>Stable</T> : scaleState === "unstable" ? <T>Unstable</T> : scaleState === "connecting" ? <T>Connecting</T> : scaleState === "error" ? <T>Error</T> : <T>Disconnected</T>}{live && <p><T>Net reading</T>: <bdi>{live.weightGrams}</bdi> g · <T>Raw frame</T>: <code>{live.rawFrame}</code></p>}{session && <p><T>Session sequence</T>: {session.assignedSequence}</p>}</div>
        {readingId && !posted && <div className="rounded-md border border-amber-300 p-3 text-sm"><p><T>Confirm the captured physical reading and movement context before posting.</T></p><p><T>Reading ID</T>: <span dir="ltr">{readingId}</span></p>{movement === "TRANSFER_RECEIPT" && <label className="block space-y-1"><T>Exception reason, if outside tolerance</T><Input value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} /></label>}<div className="mt-2 flex gap-2"><Button disabled={busy || (movement === "FINISHED_RECEIPT" && !finishedName.trim())} onClick={confirm}><T>Confirm and post</T></Button><Button variant="outline" disabled={busy} onClick={discard}><T>Discard reading</T></Button></div></div>}
        {approvalNotice && <p className="text-sm text-amber-700">{t(approvalNotice)}</p>}
        {posted && <div className="rounded-md border border-emerald-300 p-3 text-sm"><T>Posted journal</T>: <span dir="ltr">{posted.journalId}</span>{posted.inventoryItemId && <p><T>Inventory item</T>: <span dir="ltr">{posted.inventoryItemId}</span></p>}{posted.metalGrams && <p><T>Finished metal</T>: <bdi>{posted.metalGrams}</bdi> g · <T>Measured gross</T>: <bdi>{posted.grossGrams}</bdi> g</p>}<Button className="mt-2" variant="outline" onClick={discard}><T>New movement</T></Button></div>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle><T>Material balances</T></CardTitle></CardHeader><CardContent className="space-y-1 text-sm">{accountRows.length === 0 ? <T>No posted material balance yet</T> : accountRows.map((account) => <div key={account.id} className="flex justify-between gap-3 border-b py-1"><span>{account.materialKey} · {account.bucket}{account.scopeId && ` · ${account.scopeId.slice(0, 8)}`}</span><bdi>{account.balanceGrams} g</bdi></div>)}</CardContent></Card>

      {!staffMode && <Card><CardHeader><CardTitle><T>Factory setup and controls</T></CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3"><label className="space-y-1 text-sm"><T>Material to open</T><select className={fieldClass} value={openingMaterialKey} onChange={(event) => setOpeningMaterialKey(event.target.value)}>{materials.filter((material) => material.key !== "goldGrains995").map((material) => <option key={material.key} value={material.key}>{material.name}</option>)}</select></label><label className="space-y-1 text-sm"><T>Verified physical opening grams</T><Input value={openingWeight} onChange={(event) => setOpeningWeight(event.target.value)} inputMode="decimal" /></label><label className="space-y-1 text-sm"><T>Stock source</T><Input value={openingSource} onChange={(event) => setOpeningSource(event.target.value)} /></label><label className="space-y-1 text-sm md:col-span-2"><T>Opening reason</T><Input value={openingReason} onChange={(event) => setOpeningReason(event.target.value)} /></label><Button disabled={busy || !openingWeight || !openingSource.trim() || !openingReason.trim() || !materials.some((material) => material.key === openingMaterialKey)} onClick={postMaterialOpening}><T>Post audited material opening</T></Button></div>
        <div className="border-t pt-4"><h3 className="mb-2 font-semibold"><T>Register physical scale</T></h3><div className="grid gap-2 md:grid-cols-4"><label className="space-y-1 text-sm"><T>Name</T><Input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} /></label><label className="space-y-1 text-sm"><T>Purpose</T><select className={fieldClass} value={devicePurpose} onChange={(event) => setDevicePurpose(event.target.value as "GOLD" | "STONE")}><option value="GOLD"><T>Gold</T></option><option value="STONE"><T>Stone</T></option></select></label><label className="space-y-1 text-sm"><T>Connection</T><select className={fieldClass} value={deviceKind} onChange={(event) => setDeviceKind(event.target.value as "SERIAL" | "TCP")}><option value="SERIAL"><T>Serial</T></option><option value="TCP"><T>TCP</T></option></select></label><label className="space-y-1 text-sm"><T>{deviceKind === "SERIAL" ? "Serial port" : "Private LAN IP"}</T><Input value={portOrHost} onChange={(event) => setPortOrHost(event.target.value)} /></label>{deviceKind === "TCP" ? <label className="space-y-1 text-sm"><T>TCP port</T><Input value={tcpPort} onChange={(event) => setTcpPort(event.target.value)} inputMode="numeric" /></label> : <><label className="space-y-1 text-sm"><T>Baud rate</T><Input value={baudRate} onChange={(event) => setBaudRate(event.target.value)} inputMode="numeric" /></label><label className="space-y-1 text-sm"><T>Data bits</T><select className={fieldClass} value={dataBits} onChange={(event) => setDataBits(event.target.value)}><option>7</option><option>8</option></select></label><label className="space-y-1 text-sm"><T>Stop bits</T><select className={fieldClass} value={stopBits} onChange={(event) => setStopBits(event.target.value)}><option>1</option><option>2</option></select></label><label className="space-y-1 text-sm"><T>Parity</T><select className={fieldClass} value={parity} onChange={(event) => setParity(event.target.value)}><option value="none"><T>None</T></option><option value="even"><T>Even</T></option><option value="odd"><T>Odd</T></option></select></label></>}<label className="space-y-1 text-sm"><T>Stable token</T><Input value={stableToken} onChange={(event) => setStableToken(event.target.value)} /></label><label className="space-y-1 text-sm"><T>Unstable token</T><Input value={unstableToken} onChange={(event) => setUnstableToken(event.target.value)} /></label></div><div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => act(async () => setSerialPorts(await listWorkshopSerialPorts()), false)}><T>List Desktop serial ports</T></Button><Button disabled={busy || !deviceName.trim() || !portOrHost.trim()} onClick={() => act(async () => { await workshopApi.registerDevice({ name: deviceName.trim(), purpose: devicePurpose, adapterKind: deviceKind, profile: { parser: { kind: "ASCII_LINE", stableToken, unstableToken }, transport: deviceKind === "SERIAL" ? { port: portOrHost.trim(), baudRate: Number(baudRate), dataBits: Number(dataBits), stopBits: Number(stopBits), parity } : { host: portOrHost.trim(), port: Number(tcpPort) } } }); setDeviceName(""); })}><T>Register scale</T></Button>{simulatorAllowed && <Button variant="outline" disabled={busy} onClick={() => act(async () => { await workshopApi.simulatorDevice(devicePurpose); })}><T>Provision demo scale</T></Button>}</div>{serialPorts.length > 0 && <p className="mt-2 text-xs"><T>Available serial ports</T>: {serialPorts.join(", ")}</p>}<p className="mt-2 text-xs text-muted-foreground"><T>Generic ASCII protocol expects explicit stable/unstable token, NET, number and g in each line. Ask the scale vendor for three stable and three unstable sample frames before configuring a new device.</T></p></div>
        <div className="border-t pt-4"><h3 className="mb-2 font-semibold"><T>Transfer and recovery setup</T></h3><div className="grid gap-2 md:grid-cols-3"><label className="space-y-1 text-sm"><T>From department</T><Input value={fromDepartment} onChange={(event) => setFromDepartment(event.target.value)} /></label><label className="space-y-1 text-sm"><T>To department</T><Input value={toDepartment} onChange={(event) => setToDepartment(event.target.value)} /></label><Button disabled={busy || !treeId || !fromDepartment.trim() || !toDepartment.trim()} onClick={() => act(async () => { await workshopApi.prepareTransfer({ treeId, materialKey: currentMaterialKey, fromDepartment: fromDepartment.trim(), toDepartment: toDepartment.trim() }); })}><T>Prepare transfer</T></Button><label className="space-y-1 text-sm"><T>New recovery bag code</T><Input value={bagCode} onChange={(event) => setBagCode(event.target.value)} /></label><Button disabled={busy || !bagCode.trim() || !runId} onClick={() => act(async () => { await workshopApi.createRecoveryBag({ code: bagCode.trim(), materialKey: currentMaterialKey, sourceProcessRunId: runId }); setBagCode(""); })}><T>Open recovery bag</T></Button><Button variant="outline" disabled={busy || !bagId} onClick={() => act(async () => { const event = body(await workshopApi.createRecoveryEvent(bagId)); setEventId(event.id); })}><T>Close bag and create refinery event</T></Button></div></div>
      </CardContent></Card>}

      <Card><CardHeader><CardTitle><T>Process execution</T></CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        {!staffMode && <div className="grid gap-2 md:grid-cols-3">
          <label><T>New process name</T><Input value={processName} onChange={(event) => setProcessName(event.target.value)} /></label>
          <Button disabled={busy || !processName.trim()} onClick={() => act(async () => { await workshopApi.createProcess({ name: processName.trim() }); setProcessName(""); })}><T>Add process</T></Button><div />
          <label><T>Recipe name</T><Input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} /></label>
          <label><T>Target fine-gold fraction</T><Input inputMode="decimal" value={targetPurity} onChange={(event) => setTargetPurity(event.target.value)} /></label>
          <Button disabled={busy || !recipeName.trim()} onClick={() => act(async () => { await workshopApi.createRecipe({ name: recipeName.trim(), targetFineGoldFraction: targetPurity, alloyFineGoldFraction: "0", components: [{ materialKey: "masterAlloy", fraction: "1" }] }); setRecipeName(""); })}><T>Create Gold 995 and master alloy recipe</T></Button>
        </div>}
        <div className="grid gap-2 md:grid-cols-3">
          <label><T>Process</T><select className={fieldClass} value={definitionId} onChange={(event) => { setDefinitionId(event.target.value); setRouteStepId(""); setWorkstationId(""); }}><option value="">{t("Select process")}</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>
          <label><T>Job route step, optional</T><select className={fieldClass} value={routeStepId} onChange={(event) => setRouteStepId(event.target.value)}><option value="">{t("No route step")}</option>{selectedJob?.workshopRouteSteps.filter((step) => step.status === "PENDING" && step.definitionId === definitionId).map((step) => <option key={step.id} value={step.id}>{step.position + 1}. {definitions.find((definition) => definition.id === step.definitionId)?.name}</option>)}</select></label>
          <label><T>Machine, optional</T><select className={fieldClass} value={workstationId} onChange={(event) => setWorkstationId(event.target.value)}><option value="">{t("No machine")}</option>{workstations.filter((station) => !station.definitionId || station.definitionId === definitionId).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
          <label><T>Recipe, optional</T><select className={fieldClass} value={recipeId} onChange={(event) => setRecipeId(event.target.value)}><option value="">{t("No recipe")}</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · v{recipe.version}</option>)}</select></label>
          <label><T>Target CAD weight, reference only</T><Input inputMode="decimal" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} /></label>
          <Button disabled={busy || !treeId || !definitionId} onClick={() => act(async () => { const run = body(await workshopApi.startRun({ treeId, definitionId, ...(routeStepId ? { routeStepId } : {}), ...(workstationId ? { workstationId } : {}), ...(childId ? { batchChildId: childId } : {}), ...(recipeId ? { recipeId } : {}), ...(targetWeight ? { targetWeightGrams: targetWeight } : {}) })); setRunId(run.id); })}><T>Start process run</T></Button>
          <Button variant="outline" disabled={busy || !recipeId || !targetWeight} onClick={() => act(async () => { setRecommendation(body(await workshopApi.recommendRecipe(recipeId, targetWeight))); }, false)}><T>Recommend Gold 995 and alloy</T></Button>
        </div>
        {recommendation && <p><T>Reference only</T>: <T>Gold 995</T> {recommendation.recommendedGold995Grams} g · <T>Master alloy</T> {recommendation.recommendedMasterAlloyGrams} g</p>}
      </CardContent></Card>

      {staffMode && <Card><CardHeader><CardTitle><T>Prepare physical workflows</T></CardTitle></CardHeader><CardContent className="grid gap-2 text-sm md:grid-cols-3">
        <label><T>From department</T><Input value={fromDepartment} onChange={(event) => setFromDepartment(event.target.value)} /></label><label><T>To department</T><Input value={toDepartment} onChange={(event) => setToDepartment(event.target.value)} /></label>
        <Button disabled={busy || !treeId || !fromDepartment.trim() || !toDepartment.trim()} onClick={() => act(async () => { await workshopApi.prepareTransfer({ treeId, materialKey: currentMaterialKey, fromDepartment: fromDepartment.trim(), toDepartment: toDepartment.trim() }); })}><T>Prepare transfer</T></Button>
        <label><T>New recovery bag code</T><Input value={bagCode} onChange={(event) => setBagCode(event.target.value)} /></label>
        <Button disabled={busy || !bagCode.trim() || !runId} onClick={() => act(async () => { await workshopApi.createRecoveryBag({ code: bagCode.trim(), materialKey: currentMaterialKey, sourceProcessRunId: runId }); setBagCode(""); })}><T>Open recovery bag</T></Button>
        {canApprove && <Button variant="outline" disabled={busy || !bagId} onClick={() => act(async () => { const event = body(await workshopApi.createRecoveryEvent(bagId)); setEventId(event.id); })}><T>Close bag and create refinery event</T></Button>}
      </CardContent></Card>}

      {!staffMode && <FactoryManagerControls materials={materials} definitions={definitions} routes={routes} accounts={accounts} jobId={jobId} treeId={treeId} runId={runId} steps={selectedJob?.workshopRouteSteps ?? []} onRefresh={refresh} />}

      <Card><CardHeader><CardTitle><T>Reconciliation and approvals</T></CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy || !runId} onClick={() => act(async () => setReport(body(await workshopApi.runReport(runId))), false)}><T>View process reconciliation</T></Button>
          <Button variant="outline" disabled={busy || !treeId} onClick={() => act(async () => setReport(body(await workshopApi.batchReport(treeId))), false)}><T>View batch reconciliation</T></Button>
          {canApprove && <Button variant="outline" disabled={busy} onClick={() => act(async () => setReport(body(await workshopApi.reports())), false)}><T>View management reports and scale audit</T></Button>}
          {canApprove && <Button variant="outline" disabled={busy || !runId} onClick={() => act(async () => { await workshopApi.closeRun(runId); })}><T>Close reconciled run</T></Button>}
        </div>
        {canApprove && <>
          <label className="block space-y-1 text-sm"><T>Supervisor reason</T><Input value={supervisorReason} onChange={(event) => setSupervisorReason(event.target.value)} /></label>
          {excessReceipt && <label className="block max-w-md space-y-1 text-sm"><T>Verified source stock for excess transfer receipt</T><select className={fieldClass} value={excessSourceAccountId} onChange={(event) => setExcessSourceAccountId(event.target.value)}><option value="">{t("Select physical stock source")}</option>{accounts.filter((account) => account.materialKey === selectedTransfer?.materialKey && ["VAULT", "REUSABLE"].includes(account.bucket) && account.balanceGrams !== "0.000000").map((account) => <option key={account.id} value={account.id}>{account.name} · {account.balanceGrams} g</option>)}</select></label>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !jobId} onClick={() => act(async () => { await workshopApi.inspectQc(jobId, { decision: "APPROVED", reason: supervisorReason.trim() || undefined }); setApprovalNotice("QC approved; finish the piece with a Gold Scale receipt."); })}><T>Approve reconciled QC</T></Button>
            <Button variant="outline" disabled={busy || !jobId || !supervisorReason.trim()} onClick={() => act(async () => { await workshopApi.inspectQc(jobId, { decision: "REWORK", reason: supervisorReason.trim() }); setApprovalNotice("QC returned for a new rework process run."); })}><T>Return QC for rework</T></Button>
            <Button variant="outline" disabled={busy || !jobId || !supervisorReason.trim()} onClick={() => act(async () => { await workshopApi.inspectQc(jobId, { decision: "REJECTED", reason: supervisorReason.trim() }); setApprovalNotice("QC rejected the job."); })}><T>Reject QC</T></Button>
            <Button variant="outline" disabled={busy || !runId || !materialKey || !supervisorReason.trim()} onClick={() => act(async () => { await workshopApi.classifyRun(runId, materialKey, supervisorReason.trim()); })}><T>Classify process remainder</T></Button>
            <Button variant="outline" disabled={busy || !transferId || !supervisorReason.trim()} onClick={() => act(async () => { await workshopApi.approveTransfer(transferId, supervisorReason.trim()); })}><T>Approve transfer exception</T></Button>
            <Button variant="outline" disabled={busy || !transferId || !supervisorReason.trim() || (excessReceipt && !excessSourceAccountId)} onClick={() => act(async () => { await workshopApi.classifyTransfer(transferId, supervisorReason.trim(), excessReceipt ? excessSourceAccountId : undefined); })}><T>Classify transfer difference</T></Button>
            <Button variant="outline" disabled={busy || !eventId || !supervisorReason.trim()} onClick={() => act(async () => { await workshopApi.classifyRecovery(eventId, supervisorReason.trim()); })}><T>Reconcile recovery event</T></Button>
          </div>
        </>}
        {report && <WorkshopReportView report={report} />}
      </CardContent></Card>
      {error && <p role="alert" className="rounded border border-red-300 p-3 text-sm text-red-700">{t(error)}</p>}
    </div>
  );
}
